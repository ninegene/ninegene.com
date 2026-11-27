# Infrastructure

Pulumi (TypeScript) program for `ninegene.com`, one stack (`prod`) in the personal AWS account. Adapted from [winmetta/winmetta-platform](https://github.com/winmetta/winmetta-platform) `infra/`.

## The AWS account

The account is a **project account** from AWS's new sign-up ([AWS Settings](https://settings.aws.com), Projects), on the Paid plan with **advanced features** active. Without advanced features, AWS's managed policies deny the GitHub OIDC provider that deploys rely on. Checked against the AWS docs on 2026-11-16:

- **Regions:** Regional resources (the site bucket, the Pulumi state bucket and its KMS key) live in the project's Region, which AWS assigns from the contact address: `us-east-2` for a US address. Check it in AWS Settings → Project → Overview → Additional info. In `us-east-1` the managed policies allow only global services, so only the CloudFront certificate (which CloudFront requires there) is created in `us-east-1`. If the project's Region is not `us-east-2`, change `region` in `pulumi/Pulumi.prod.yaml`, the backend URL in `pulumi/Pulumi.yaml`, `REGION` for the bootstrap and the `AWS_REGION` variable of the GitHub environment.
- **Sign-in:** `aws login --profile <name>`, choosing the project in the browser; not `aws configure sso` or access keys.
- **Costs:** advanced features remove spend limits, so keep an AWS Budget with email alerts in the management account.

| Resource                       | Purpose                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Route 53 zone `ninegene.com`   | The whole domain. Protected from deletion.                                                                                      |
| Mail records                   | Fastmail MX, SPF and three DKIM CNAMEs, copied from the registrar's DNS on 2026-11-15.                                          |
| S3 bucket                      | In the project's Region. Private, versioned, encrypted; only the distribution can read it. Protected from deletion.             |
| CloudFront function            | `pulumi/functions/viewer-request.js`: `www` to apex redirect, directory index, trailing-slash redirect. Tested with `npm test`. |
| Response headers policy        | HSTS (apex only), CSP, nosniff, frame, referrer and permissions headers.                                                        |
| ACM certificate                | In `us-east-1` (CloudFront requires it). `ninegene.com` and `www.ninegene.com`, validated through Route 53.                     |
| CloudFront distribution        | `PriceClass_All`; 403 and 404 serve `/404.html` with a 404 status.                                                              |
| Alias records                  | A and AAAA for the apex and `www`.                                                                                              |
| IAM role `ninegene-com-deploy` | GitHub OIDC, `production` environment of `ninegene/ninegene.com` only: sync the bucket and invalidate the distribution.         |

Cost at personal-site traffic: about $0.50 a month for the hosted zone plus a few cents for S3 and CloudFront.

## Checks (no AWS access needed)

```bash
cd infra/pulumi
npm install
npm run typecheck
npm test
```

## One-time setup

Every step below signs in to AWS or changes the live account, so each is run by the owner, on purpose.

1. **Sign in** to the project and set `AWS_PROFILE`:

   ```bash
   aws login --profile ninegene
   export AWS_PROFILE=ninegene
   ```

2. **Bootstrap** the Pulumi state bucket (`ninegene-pulumi-state`), KMS key (`alias/ninegene-pulumi`) and the GitHub OIDC provider. Dry run first, then apply:

   ```bash
   ./infra/bootstrap/bootstrap.sh
   ./infra/bootstrap/bootstrap.sh --apply
   ```

   It uses `us-east-2` unless you set `REGION=<project Region>`. Bucket names are global; if the name is taken, rerun with `BUCKET=<name>` and change `backend.url` in `pulumi/Pulumi.yaml` to match.

3. **Create the stack** (the backend URL comes from `Pulumi.yaml`):

   ```bash
   cd infra/pulumi
   npm install
   pulumi stack init prod --secrets-provider "awskms://alias/ninegene-pulumi?region=us-east-2"
   ```

## First deploy: staged, so mail never breaks

1. **Zone, mail records and bucket.** With `delegationConfirmed` false (the default in `Pulumi.prod.yaml`):

   ```bash
   pulumi preview --stack prod
   pulumi up --stack prod
   pulumi stack output nameServers --stack prod
   ```

2. **Check the mail records in the new zone** before switching anything. Each answer must match the current one:

   ```bash
   ns="$(pulumi stack output nameServers --stack prod --json | jq -r '.[0]')"
   for rec in MX:ninegene.com TXT:ninegene.com CNAME:fm1._domainkey.ninegene.com CNAME:fm2._domainkey.ninegene.com CNAME:fm3._domainkey.ninegene.com; do
     type="${rec%%:*}" name="${rec#*:}"
     echo "$name $type"; dig +short "$type" "$name" @"$ns"; dig +short "$type" "$name"
   done
   ```

   Also check the Moniker DNS panel for any record that `dig` can't discover (other subdomains, verification TXT records) and add it to `mailRecords` or a new record in `index.ts` first.

3. **Switch the name servers** at the registrar (Moniker) to the four `nameServers`. Wait until `dig NS ninegene.com +short` returns them, then send and receive a test email.
4. **Certificate, distribution and deploy role:**

   ```bash
   pulumi config set delegationConfirmed true --stack prod
   pulumi up --stack prod
   pulumi stack output --stack prod
   ```

5. **GitHub environment.** In the repository's Settings > Environments, create `production` with the variables `SITE_URL` (`https://ninegene.com`), `AWS_REGION` (the project's Region, only if it is not `us-east-2`), `PUBLIC_ALLOW_INDEXING` (`true`), `SITE_BUCKET` (`siteBucket` output), `CLOUDFRONT_DISTRIBUTION_ID` (`distributionId` output) and the secret `AWS_ACCOUNT_ID`. Then run the Deploy workflow (or merge to `main`).
6. **After launch:** add `https://ninegene.com` to the GitHub profile's website field. In Google Search Console, add a Domain property for `ninegene.com`, put its `google-site-verification=` value in the apex TXT record in `pulumi/index.ts`, apply, verify, then submit `https://ninegene.com/sitemap-index.xml`.

## Later

- DMARC: `_dmarc.ninegene.com` is `p=none` with reports to `dmarc@ninegene.com` (since 2026-11-16). After a few weeks of reports showing only Fastmail sending as the domain, change it to `p=quarantine` in `pulumi/index.ts`.
- Subdomains for dev-practice and shell-lab: add their records to this program when each launches. `shell-explain.ninegene.com` is live and is managed by the shell-explain repository's own infrastructure, not here.
