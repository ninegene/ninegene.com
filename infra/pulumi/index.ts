// Hosting for ninegene.com: a private S3 bucket behind CloudFront (origin access
// control), an ACM certificate, the Route 53 zone for the whole domain (including the
// Fastmail mail records) and the GitHub OIDC deploy role.
//
// Adapted from winmetta/winmetta-platform (infra/pulumi/index.ts), without its
// analytics, feedback and preview-role parts.
//
// Regions: the AWS account is a project account from AWS's new sign-up (AWS Settings,
// Projects) with advanced features active. Its managed policies allow only global
// services (CloudFront, IAM, Route 53, ACM, STS) in us-east-1, so Regional resources
// (the site bucket) live in the project's Region (`region` config, us-east-2 for a US
// address; see AWS Settings > Project > Overview > Additional info). The CloudFront
// certificate must be requested in us-east-1 and uses its own provider.
//
// The first apply is staged, because ACM DNS validation needs the zone to be live:
//   1. With `delegationConfirmed` unset (false), `pulumi up` creates only the hosted zone,
//      the mail records and the site bucket. Mail keeps working once you switch.
//   2. At the registrar (Moniker), replace the name servers with the zone's four
//      `nameServers`, and wait until `dig NS ninegene.com` returns them.
//   3. `pulumi config set delegationConfirmed true` and `pulumi up` again for the
//      certificate, distribution, alias records and deploy role.
// See infra/README.md.
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const domain = config.get('domain') ?? 'ninegene.com';
const wwwDomain = `www.${domain}`;
const githubRepo = config.get('githubRepo') ?? 'ninegene/ninegene.com';
const githubEnvironment = config.get('githubEnvironment') ?? 'production';
// The start of GitHub's OIDC `sub` claim, which the deploy role's trust policy must match
// exactly. This repository uses the default, name-based subject (checked 2026-11-15 with
// `gh api repos/ninegene/ninegene.com/actions/oidc/customization/sub`). If the repository
// switches to immutable subjects, set `githubSubjectPrefix` to the new prefix.
const githubSubjectPrefix =
  config.get('githubSubjectPrefix') ?? `repo:${githubRepo}`;
const siteBucketName = config.get('siteBucketName') ?? 'ninegene-com-site';
const delegationConfirmed = config.getBoolean('delegationConfirmed') ?? false;
const region = config.get('region') ?? 'us-east-2';

const tags = {
  project: 'ninegene.com',
  environment: 'production',
  'managed-by': 'pulumi',
};
const provider = new aws.Provider('aws', {
  region,
  defaultTags: { tags },
});
const opts: pulumi.CustomResourceOptions = { provider };
// CloudFront only accepts ACM certificates from us-east-1.
const usEast1 = new aws.Provider('aws-us-east-1', {
  region: 'us-east-1',
  defaultTags: { tags },
});

const account = aws.getCallerIdentityOutput({}, { provider });
// Created once by infra/bootstrap/bootstrap.sh, not by this program.
const oidcProviderArn = pulumi.interpolate`arn:aws:iam::${account.accountId}:oidc-provider/token.actions.githubusercontent.com`;

// --- DNS: the whole ninegene.com zone ----------------------------------------------
// Protected: deleting the zone would change its name servers and break the domain.
const zone = new aws.route53.Zone(
  'zone',
  { name: domain, comment: `${domain} (Pulumi)` },
  { provider, protect: true },
);
export const nameServers = zone.nameServers;

// Mail is hosted by Fastmail. These records were copied from the registrar's DNS on
// 2026-11-15 (MX, SPF and the three DKIM CNAMEs; there was no DMARC record). They must
// exist here before the name servers are switched, or mail to @ninegene.com stops.
// Fastmail's current list: https://www.fastmail.help/hc/en-us/articles/360060591153
// DMARC (added 2026-11-16) starts at p=none: receivers deliver as before and send
// daily aggregate reports to dmarc@ninegene.com, an alias set up in Fastmail. Move to
// p=quarantine once the reports show only Fastmail sending as the domain. Subdomains
// inherit the policy.
const mailRecords: { name: string; type: string; records: string[] }[] = [
  {
    name: domain,
    type: 'MX',
    records: [
      '10 in1-smtp.messagingengine.com',
      '20 in2-smtp.messagingengine.com',
    ],
  },
  {
    name: domain,
    type: 'TXT',
    records: ['v=spf1 include:spf.messagingengine.com ?all'],
  },
  ...['fm1', 'fm2', 'fm3'].map((selector) => ({
    name: `${selector}._domainkey.${domain}`,
    type: 'CNAME',
    records: [`${selector}.${domain}.dkim.fmhosted.com`],
  })),
  {
    name: `_dmarc.${domain}`,
    type: 'TXT',
    records: [`v=DMARC1; p=none; rua=mailto:dmarc@${domain}`],
  },
];
for (const record of mailRecords) {
  const label = record.name === domain ? 'apex' : record.name.split('.')[0];
  new aws.route53.Record(
    `mail-${record.type.toLowerCase()}-${label}`,
    {
      zoneId: zone.zoneId,
      name: record.name,
      type: record.type,
      ttl: 3600,
      records: record.records,
    },
    opts,
  );
}

// --- Site bucket: private, versioned, readable only through CloudFront --------------
const bucket = new aws.s3.Bucket(
  'site',
  { bucket: siteBucketName },
  { provider, protect: true },
);
export const siteBucket = bucket.bucket;
// S3 rejects bucket-configuration calls made at the same time (OperationAborted), and
// Pulumi runs independent resources in parallel, so chain them one after another.
const ownership = new aws.s3.BucketOwnershipControls(
  'site',
  { bucket: bucket.id, rule: { objectOwnership: 'BucketOwnerEnforced' } },
  opts,
);
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock(
  'site',
  {
    bucket: bucket.id,
    blockPublicAcls: true,
    ignorePublicAcls: true,
    blockPublicPolicy: true,
    restrictPublicBuckets: true,
  },
  { provider, dependsOn: [ownership] },
);
const encryption = new aws.s3.BucketServerSideEncryptionConfiguration(
  'site',
  {
    bucket: bucket.id,
    rules: [
      {
        applyServerSideEncryptionByDefault: { sseAlgorithm: 'AES256' },
        bucketKeyEnabled: true,
      },
    ],
  },
  { provider, dependsOn: [publicAccessBlock] },
);
// Versioning gives a way back from a bad upload; old versions expire after 30 days.
const versioning = new aws.s3.BucketVersioning(
  'site',
  { bucket: bucket.id, versioningConfiguration: { status: 'Enabled' } },
  { provider, dependsOn: [encryption] },
);
const lifecycle = new aws.s3.BucketLifecycleConfiguration(
  'site',
  {
    bucket: bucket.id,
    rules: [
      {
        id: 'expire-old-versions',
        status: 'Enabled',
        filter: {},
        noncurrentVersionExpiration: { noncurrentDays: 30 },
        abortIncompleteMultipartUpload: { daysAfterInitiation: 7 },
      },
    ],
  },
  { provider, dependsOn: [versioning] },
);

// --- CloudFront ---------------------------------------------------------------------
const originAccessControl = new aws.cloudfront.OriginAccessControl(
  'site',
  {
    name: 'ninegene-com-site',
    description: 'CloudFront access to the private site bucket',
    originAccessControlOriginType: 's3',
    signingBehavior: 'always',
    signingProtocol: 'sigv4',
  },
  opts,
);

// www redirect, directory index and trailing-slash redirect (see the file's header).
const viewerRequest = new aws.cloudfront.Function(
  'viewer-request',
  {
    name: 'ninegene-com-viewer-request',
    runtime: 'cloudfront-js-2.0',
    comment: 'www redirect, directory index and trailing-slash redirect',
    publish: true,
    code: fs.readFileSync(
      path.join(__dirname, 'functions', 'viewer-request.js'),
      'utf8',
    ),
  },
  opts,
);

// The site ships no JavaScript. Styles may be inlined by Astro and code blocks carry
// style attributes from the syntax highlighter, hence 'unsafe-inline' for styles only.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const headersPolicy = new aws.cloudfront.ResponseHeadersPolicy(
  'security-headers',
  {
    name: 'ninegene-com-security-headers',
    comment: `Security headers for ${domain}`,
    securityHeadersConfig: {
      strictTransportSecurity: {
        accessControlMaxAgeSec: 31536000,
        // Subdomains (shell-explain, dev-practice, ...) are hosted elsewhere.
        includeSubdomains: false,
        preload: false,
        override: true,
      },
      contentSecurityPolicy: {
        contentSecurityPolicy,
        override: true,
      },
      contentTypeOptions: { override: true },
      frameOptions: { frameOption: 'DENY', override: true },
      referrerPolicy: {
        referrerPolicy: 'strict-origin-when-cross-origin',
        override: true,
      },
    },
    customHeadersConfig: {
      items: [
        {
          header: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
          override: true,
        },
      ],
    },
  },
  opts,
);

// AWS-managed cache policy: compression on, and the origin's Cache-Control decides the
// TTL (immutable for hashed files, short for HTML; see the deploy workflow).
const cachingOptimized = aws.cloudfront.getCachePolicyOutput(
  { name: 'Managed-CachingOptimized' },
  { provider },
);

const originId = 'site-bucket';
let distribution: aws.cloudfront.Distribution | undefined;
let deployRoleArn: pulumi.Output<string> | undefined;

if (delegationConfirmed) {
  // --- ACM certificate for the apex and www, validated through Route 53 -------------
  const certificate = new aws.acm.Certificate(
    'site',
    {
      domainName: domain,
      subjectAlternativeNames: [wwwDomain],
      validationMethod: 'DNS',
    },
    { provider: usEast1 },
  );
  const validationFqdns = [domain, wwwDomain].map((name) => {
    const option = certificate.domainValidationOptions.apply((options) => {
      const match = options.find((o) => o.domainName === name);
      if (!match) throw new Error(`ACM returned no DNS validation for ${name}`);
      return match;
    });
    const record = new aws.route53.Record(
      `cert-validation-${name === domain ? 'apex' : 'www'}`,
      {
        zoneId: zone.zoneId,
        name: option.resourceRecordName,
        type: option.resourceRecordType,
        records: [option.resourceRecordValue],
        ttl: 300,
        allowOverwrite: true,
      },
      opts,
    );
    return record.fqdn;
  });
  const validation = new aws.acm.CertificateValidation(
    'site',
    { certificateArn: certificate.arn, validationRecordFqdns: validationFqdns },
    { provider: usEast1 },
  );

  distribution = new aws.cloudfront.Distribution(
    'site',
    {
      enabled: true,
      comment: domain,
      aliases: [domain, wwwDomain],
      httpVersion: 'http2and3',
      isIpv6Enabled: true,
      // All edges: readers include people in Asia (Burmese learners). At this traffic the
      // price difference from the cheaper classes is cents.
      priceClass: 'PriceClass_All',
      origins: [
        {
          originId,
          domainName: bucket.bucketRegionalDomainName,
          originAccessControlId: originAccessControl.id,
        },
      ],
      defaultCacheBehavior: {
        targetOriginId: originId,
        viewerProtocolPolicy: 'redirect-to-https',
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD'],
        cachePolicyId: cachingOptimized.id,
        responseHeadersPolicyId: headersPolicy.id,
        compress: true,
        functionAssociations: [
          { eventType: 'viewer-request', functionArn: viewerRequest.arn },
        ],
      },
      // With origin access control and no s3:ListBucket, S3 answers 403 for a missing
      // key, so both 403 and 404 serve the site's own 404 page with a real 404 status.
      customErrorResponses: [403, 404].map((errorCode) => ({
        errorCode,
        responseCode: 404,
        responsePagePath: '/404.html',
        errorCachingMinTtl: 10,
      })),
      restrictions: { geoRestriction: { restrictionType: 'none' } },
      viewerCertificate: {
        acmCertificateArn: validation.certificateArn,
        sslSupportMethod: 'sni-only',
        minimumProtocolVersion: 'TLSv1.2_2021',
      },
    },
    opts,
  );

  // Only this distribution may read the bucket.
  new aws.s3.BucketPolicy(
    'site',
    {
      bucket: bucket.id,
      policy: pulumi.jsonStringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'AllowCloudFrontRead',
            Effect: 'Allow',
            Principal: { Service: 'cloudfront.amazonaws.com' },
            Action: 's3:GetObject',
            Resource: pulumi.interpolate`${bucket.arn}/*`,
            Condition: { StringEquals: { 'AWS:SourceArn': distribution.arn } },
          },
          {
            Sid: 'DenyInsecureTransport',
            Effect: 'Deny',
            Principal: '*',
            Action: 's3:*',
            Resource: [bucket.arn, pulumi.interpolate`${bucket.arn}/*`],
            Condition: { Bool: { 'aws:SecureTransport': 'false' } },
          },
        ],
      }),
    },
    { provider, dependsOn: [lifecycle] },
  );

  // Alias records (IPv4 and IPv6) for the apex and www. Z2FDTNDATAQYW2 is the fixed
  // hosted zone ID that every CloudFront distribution uses.
  for (const name of [domain, wwwDomain]) {
    for (const type of ['A', 'AAAA']) {
      new aws.route53.Record(
        `alias-${name === domain ? 'apex' : 'www'}-${type}`,
        {
          zoneId: zone.zoneId,
          name,
          type,
          aliases: [
            {
              name: distribution.domainName,
              zoneId: 'Z2FDTNDATAQYW2',
              evaluateTargetHealth: false,
            },
          ],
        },
        opts,
      );
    }
  }

  // --- Deploy role for GitHub Actions (OIDC, no stored keys) --------------------------
  // Trusts only this repository's `production` environment. It can sync the site bucket
  // and invalidate this one distribution, nothing else.
  const deployRole = new aws.iam.Role(
    'deploy',
    {
      name: 'ninegene-com-deploy',
      description: `GitHub Actions deploy of ${domain} (production environment only)`,
      maxSessionDuration: 3600,
      assumeRolePolicy: pulumi.jsonStringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Federated: oidcProviderArn },
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                'token.actions.githubusercontent.com:sub': `${githubSubjectPrefix}:environment:${githubEnvironment}`,
              },
            },
          },
        ],
      }),
    },
    opts,
  );
  new aws.iam.RolePolicy(
    'deploy',
    {
      role: deployRole.id,
      policy: pulumi.jsonStringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'ListSiteBucket',
            Effect: 'Allow',
            Action: [
              's3:ListBucket',
              's3:GetBucketLocation',
              's3:ListBucketMultipartUploads',
            ],
            Resource: bucket.arn,
          },
          {
            Sid: 'WriteSiteObjects',
            Effect: 'Allow',
            Action: [
              's3:PutObject',
              's3:GetObject',
              's3:DeleteObject',
              's3:AbortMultipartUpload',
            ],
            Resource: pulumi.interpolate`${bucket.arn}/*`,
          },
          {
            Sid: 'InvalidateDistribution',
            Effect: 'Allow',
            Action: [
              'cloudfront:CreateInvalidation',
              'cloudfront:GetInvalidation',
            ],
            Resource: distribution.arn,
          },
        ],
      }),
    },
    opts,
  );
  deployRoleArn = deployRole.arn;
}

const pending = 'not created yet (delegationConfirmed is false)';
export const distributionId = distribution ? distribution.id : pending;
export const distributionDomain = distribution
  ? distribution.domainName
  : pending;
export const deployRole = deployRoleArn ?? pending;
export const url = delegationConfirmed ? `https://${domain}/` : pending;
