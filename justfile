# Tasks for ninegene.com. Run `just` to list them.

default:
    @just --list

# Install the site and infrastructure dependencies.
setup:
    npm install
    npm install --prefix infra/pulumi

# Start the dev server (drafts are shown) on http://127.0.0.1:4321.
dev:
    npm run dev

# Build the site into dist/.
build:
    npm run build

# Serve the built site on http://127.0.0.1:4321.
preview: build
    npm run preview

# Format everything with Prettier.
format:
    npm run format

# Everything CI checks: formatting, types, build, infra types and tests, script lint.
check:
    npm run format:check
    npm run check
    npm run build
    npm run typecheck --prefix infra/pulumi
    npm test --prefix infra/pulumi
    shellcheck infra/bootstrap/bootstrap.sh
    node --test scripts/check-versions.test.mjs

# Compare Node.js and the Pulumi CLI with their newest LTS and release (needs network).
versions:
    node scripts/check-versions.mjs

# Preview infrastructure changes (read-only; needs AWS credentials).
infra-preview:
    cd infra/pulumi && pulumi preview --stack prod
