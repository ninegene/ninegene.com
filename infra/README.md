# Infrastructure

Pulumi (TypeScript) program for `ninegene.com`, one stack (`prod`) in the personal AWS account, all in `us-east-1`. Adapted from [winmetta/winmetta-platform](https://github.com/winmetta/winmetta-platform) `infra/`.

| Resource                       | Purpose                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Route 53 zone `ninegene.com`   | The whole domain. Protected from deletion.                                                                                      |
| Mail records                   | Fastmail MX, SPF and three DKIM CNAMEs, copied from the registrar's DNS on 2026-11-15.                                          |
| S3 bucket                      | Private, versioned, encrypted; only the distribution can read it. Protected from deletion.                                      |
| CloudFront function            | `pulumi/functions/viewer-request.js`: `www` to apex redirect, directory index, trailing-slash redirect. Tested with `npm test`. |
| Response headers policy        | HSTS (apex only), CSP, nosniff, frame, referrer and permissions headers.                                                        |
| ACM certificate                | `ninegene.com` and `www.ninegene.com`, validated through Route 53.                                                              |
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

1. **Sign in** with an administrator profile of the personal AWS account and set `AWS_PROFILE`.
2. **Bootstrap** the Pulumi state bucket (`ninegene-pulumi-state`), KMS key (`alias/ninegene-pulumi`) and the GitHub OIDC provider. Dry run first, then apply:

   ```bash
   ./infra/bootstrap/bootstrap.sh
   ./infra/bootstrap/bootstrap.sh --apply
   ```

   Bucket names are global; if the name is taken, rerun with `BUCKET=<name>` and change `backend.url` in `pulumi/Pulumi.yaml` to match.

3. **Create the stack** (the backend URL comes from `Pulumi.yaml`):

   ```bash
   cd infra/pulumi
   npm install
   pulumi stack init prod --secrets-provider "awskms://alias/ninegene-pulumi?region=us-east-1"
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

5. **GitHub environment.** In the repository's Settings > Environments, create `production` with the variables `SITE_URL` (`https://ninegene.com`), `PUBLIC_ALLOW_INDEXING` (`true`), `SITE_BUCKET` (`siteBucket` output), `CLOUDFRONT_DISTRIBUTION_ID` (`distributionId` output) and the secret `AWS_ACCOUNT_ID`. Then run the Deploy workflow (or merge to `main`).
6. **After launch:** add `https://ninegene.com` to the GitHub profile's website field and submit `https://ninegene.com/sitemap-index.xml` in Google Search Console.

## Later

- A DMARC record (`_dmarc.ninegene.com`): there is none today. Start with `v=DMARC1; p=none; rua=mailto:<address>` once you choose where reports go.
- Subdomains for shell-explain, dev-practice and shell-lab: add their records to this program when each launches.
