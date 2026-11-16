#!/usr/bin/env bash
# One-time AWS bootstrap for the ninegene.com Pulumi backend (see infra/README.md).
# Adapted from winmetta/winmetta-platform (infra/bootstrap/bootstrap.sh).
# Creates what must exist before `pulumi login s3://...` and is not managed by Pulumi:
#   1. a private, versioned S3 bucket for Pulumi state
#   2. a KMS key (alias/ninegene-pulumi) for Pulumi's secrets provider
#   3. the GitHub Actions OIDC identity provider
# Safe to re-run: each step checks whether the resource already exists.
#
# The account is a project account from AWS's new sign-up with advanced features
# active: without them, the OIDC provider (step 3) is denied by AWS's managed policies.
# Regional resources go in the project's Region (us-east-2 for a US address; set
# REGION= if AWS Settings shows another), which must match Pulumi.yaml's backend URL.
#
# Dry run by default (prints every command, changes nothing). Sign in with
# `aws login --profile <name>`, set AWS_PROFILE, then apply with:
#   ./infra/bootstrap/bootstrap.sh --apply
#
# The account ID is never written to a file or printed. Works with bash 3.2 and AWS CLI v2.
set -euo pipefail

REGION="${REGION:-us-east-2}"
BUCKET="${BUCKET:-ninegene-pulumi-state}" # bucket names are global; set BUCKET= if taken
KMS_ALIAS="alias/ninegene-pulumi"
OIDC_URL="token.actions.githubusercontent.com"

apply=false
[ "${1:-}" = "--apply" ] && apply=true

# AWS_REGION wins over AWS_DEFAULT_REGION, so set both. An empty pager keeps the
# CLI from blocking the script on a "less" prompt.
export AWS_REGION="$REGION" AWS_DEFAULT_REGION="$REGION" AWS_PAGER=""
[ -n "${AWS_PROFILE:-}" ] || {
    echo "Set AWS_PROFILE to the profile you signed in with (aws login --profile <name>) first." >&2
    exit 1
}

# Run a changing command, or only print it in a dry run. AWS responses can
# contain the account ID (an OIDC provider ARN, for example), so mask it in the
# command's output.
run() {
    local out
    if $apply; then
        echo "+ $*"
        out="$("$@")"
        [[ -z "$out" ]] || printf '%s\n' "${out//${account_id:-ACCOUNT}/ACCOUNT}"
    else
        echo "[dry run] $*"
    fi
}

# Run a read-only check and print one word: "exists", "missing" (the error matched
# $1, the service's not-found pattern) or "blocked" (any other error, such as an
# AccessDenied from a policy, which is also printed to stderr with the account ID
# masked). Telling "missing" from "blocked" keeps the script from trying to create
# what it isn't allowed to see.
probe() {
    local missing_pattern="$1" err
    shift
    if err="$("$@" 2>&1 >/dev/null)"; then
        echo exists
    elif [[ "$err" =~ $missing_pattern ]]; then
        echo missing
    else
        printf '%s\n' "${err//${account_id:-ACCOUNT}/ACCOUNT}" >&2
        echo blocked
    fi
}

# Read-only calls always run, so the dry run shows what already exists.
identity="$(aws sts get-caller-identity --query '[Arn,Account]' --output text)" || {
    echo "Not signed in. Run: aws login --profile $AWS_PROFILE" >&2
    exit 1
}
caller="${identity%%$'\t'*}"
account_id="${identity##*$'\t'}"
echo "Signed in as: ${caller//$account_id/ACCOUNT}"
echo "Region: $REGION   State bucket: $BUCKET   KMS alias: $KMS_ALIAS"
$apply || echo "Dry run: nothing will change. Add --apply to create the resources."
echo

# Preflight: check all three resources before changing anything, so a denied
# check stops the run instead of failing halfway through. A read that is allowed
# doesn't prove the create is, but a denied read means the create would fail too.
bucket_state="$(probe '404|Not Found|NoSuchBucket' aws s3api head-bucket --bucket "$BUCKET")"
key_state="$(probe 'NotFoundException' aws kms describe-key --key-id "$KMS_ALIAS")"
provider_arn="arn:aws:iam::${account_id}:oidc-provider/${OIDC_URL}"
oidc_state="$(probe 'NoSuchEntity' aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$provider_arn")"
echo "Preflight: bucket $bucket_state, KMS key $key_state, OIDC provider $oidc_state"
if [[ "$bucket_state" == blocked || "$key_state" == blocked || "$oidc_state" == blocked ]]; then
    {
        echo "error: a check above was refused, so nothing was changed."
        [[ "$bucket_state" == blocked ]] && echo "  bucket: the name may belong to another account (rerun with BUCKET=<another name>), or a policy denies S3."
        [[ "$oidc_state" == blocked ]] && echo "  OIDC provider: an AWS-managed policy denies iam:*Provider*: activate advanced features and check that no service control policy still denies it (see infra/README.md)."
        echo "  Fix the cause, then run this script again."
    } >&2
    exit 1
fi
echo

# 1. State bucket ---------------------------------------------------------------
if [[ "$bucket_state" == exists ]]; then
    echo "ok       bucket $BUCKET exists (settings below are re-applied, which is harmless)"
else
    # Every Region except us-east-1 needs a LocationConstraint. The bucket is private
    # from the start.
    location=()
    [ "$REGION" = "us-east-1" ] || location=(--create-bucket-configuration "LocationConstraint=$REGION")
    run aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" --object-ownership BucketOwnerEnforced ${location[@]+"${location[@]}"}
fi
run aws s3api put-public-access-block --bucket "$BUCKET" \
    --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
run aws s3api put-bucket-versioning --bucket "$BUCKET" --versioning-configuration Status=Enabled
run aws s3api put-bucket-encryption --bucket "$BUCKET" \
    --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
# Refuse plain-HTTP access. This replaces any existing bucket policy, which is fine
# for a bucket this script created and owns.
run aws s3api put-bucket-policy --bucket "$BUCKET" --policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"DenyInsecureTransport\",\"Effect\":\"Deny\",\"Principal\":\"*\",\"Action\":\"s3:*\",\"Resource\":[\"arn:aws:s3:::$BUCKET\",\"arn:aws:s3:::$BUCKET/*\"],\"Condition\":{\"Bool\":{\"aws:SecureTransport\":\"false\"}}}]}"
# Keep old state versions for 90 days (rollback), then expire them, and clean up
# abandoned uploads.
run aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" \
    --lifecycle-configuration '{"Rules":[{"ID":"expire-old-state-versions","Status":"Enabled","Filter":{},"NoncurrentVersionExpiration":{"NoncurrentDays":90},"AbortIncompleteMultipartUpload":{"DaysAfterInitiation":7}}]}'

# 2. KMS key for Pulumi secrets -------------------------------------------------
if [[ "$key_state" == exists ]]; then
    echo "ok       KMS key $KMS_ALIAS exists"
else
    if $apply; then
        key_id="$(aws kms create-key --description "ninegene.com Pulumi secrets provider" --query KeyMetadata.KeyId --output text)"
        echo "+ aws kms create-key ... -> $key_id"
        # If a later step fails, a rerun would create a second key (the alias is what it
        # looks for), so say which key is left over.
        trap 'echo "error: key $key_id was created but is not finished. Fix the error, then run: aws kms enable-key-rotation --key-id $key_id; aws kms create-alias --alias-name $KMS_ALIAS --target-key-id $key_id (or schedule it for deletion) before rerunning." >&2' ERR
        run aws kms enable-key-rotation --key-id "$key_id"
        run aws kms create-alias --alias-name "$KMS_ALIAS" --target-key-id "$key_id"
        trap - ERR
    else
        echo "[dry run] aws kms create-key --description \"ninegene.com Pulumi secrets provider\""
        echo "[dry run] aws kms enable-key-rotation --key-id <new key id>"
        echo "[dry run] aws kms create-alias --alias-name $KMS_ALIAS --target-key-id <new key id>"
    fi
fi

# 3. GitHub Actions OIDC identity provider ---------------------------------------
if [[ "$oidc_state" == exists ]]; then
    echo "ok       OIDC provider $OIDC_URL exists"
else
    # AWS validates GitHub's certificate against its trusted CAs, so no thumbprint is needed.
    run aws iam create-open-id-connect-provider --url "https://$OIDC_URL" --client-id-list sts.amazonaws.com
fi

echo
echo "Created or found (names only, never the account ID):"
echo "  state bucket: $BUCKET ($REGION)   KMS alias: $KMS_ALIAS   OIDC provider: $OIDC_URL"
echo "Then: pulumi login s3://$BUCKET   and use  --secrets-provider \"awskms://$KMS_ALIAS?region=$REGION\""
