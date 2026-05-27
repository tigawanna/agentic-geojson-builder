# Publishing this CLI to npm (maintainer guide)

This page is for **the maintainer of `create-era-next`**, not end users.

The full publishing workflow lives in the monorepo root at
[`.github/workflows/publish-cli.yml`](../../.github/workflows/publish-cli.yml).

## One-time setup

1. Create an npm account and run `npm login` locally once.
2. In GitHub → Settings → Secrets → Actions, add `NPM_TOKEN`
   (an [automation token](https://docs.npmjs.com/creating-and-viewing-access-tokens)
   with **Publish** scope).
3. (Recommended) Enable **npm provenance**: the workflow already runs
   `npm publish --provenance` under the `id-token: write` permission, which
   gives your package an attested supply-chain badge on npm.

## Cutting a release

```bash
# From the monorepo root:
npm version --workspace packages/cli patch        # or minor / major
git push --follow-tags
```

The tag `cli-v<version>` triggers
[`publish-cli.yml`](../../.github/workflows/publish-cli.yml), which:

1. Installs deps
2. Builds the CLI (`tsup` → `packages/cli/dist/index.js`)
3. **Smoke tests** it by scaffolding into `/tmp/smoke-*`
4. Runs `npm publish --provenance --access public`

## Manual fallback

```bash
cd packages/cli
npm run build
npm publish --access public
```

## Versioning

- `patch` — bugfixes, README tweaks
- `minor` — new features, additional template options
- `major` — breaking CLI flag changes, removed template files

Follow [SemVer](https://semver.org/). The scaffolded apps have their own
version numbers — users don't care what version of the CLI was used.
