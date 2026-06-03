# Desktop releases (GitHub)

Prebuilt Electron installers are published to [GitHub Releases](https://github.com/tigawanna/agentic-geojson-builder/releases) when you push a `v*` tag. CI builds macOS, Windows, and Linux on separate runners, then attaches all installers to one release.

## Quick start: ship a release

From the monorepo root, with a clean working tree:

```bash
bash scripts/ship-release.sh 0.2.0
```

This will:

1. Set `apps/desktop/package.json` version to `0.2.0` (if different)
2. Commit `chore(desktop): release v0.2.0` when the version file changed
3. Create annotated tag `v0.2.0`
4. Push the branch and tag to `origin`

GitHub Actions ([`.github/workflows/release.yml`](../.github/workflows/release.yml)) then builds all platforms and runs [`scripts/release.sh`](../scripts/release.sh) to upload assets.

### Options

| Flag        | Meaning                                 |
| ----------- | --------------------------------------- |
| `--yes`     | No confirmation prompt                  |
| `--dry-run` | Show plan only                          |
| `--no-push` | Create tag locally; push manually later |

```bash
bash scripts/ship-release.sh --dry-run 0.2.0
bash scripts/ship-release.sh --yes 0.2.0
bash scripts/ship-release.sh --no-push 0.2.0
```

Use the version already in `package.json` (tag only, no bump):

```bash
bash scripts/ship-release.sh
```

## Manual tag (without the script)

```bash
cd apps/desktop
npm version 0.2.0 --no-git-tag-version
cd ../..
git add apps/desktop/package.json
git commit -m "chore(desktop): release v0.2.0"
git tag -a v0.2.0 -m "Desktop release 0.2.0"
git push origin main
git push origin v0.2.0
```

Tags must match `v<semver>` (e.g. `v0.2.0`) so the release workflow runs.

## CI triggers

| Trigger                              | Workflow                                          | Result                                                              |
| ------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------- |
| Push / PR to `main`                  | [`ci.yml`](../.github/workflows/ci.yml)           | Typecheck, test, build, package smoke test; upload `dist/` artifact |
| Push tag `v*`                        | [`release.yml`](../.github/workflows/release.yml) | Matrix build macOS / Windows / Linux → GitHub Release               |
| Actions → **Release** → Run workflow | `release.yml`                                     | Same as tag (set version + optional draft)                          |

## Local build and publish (no tag)

**Package only** (current OS, no upload):

```bash
pnpm --filter ./apps/desktop run package:mac
pnpm --filter ./apps/desktop run package:win
pnpm --filter ./apps/desktop run package:linux
```

Output: `apps/desktop/release/<version>/`.

**Zip into `dist/` + checksums** (no GitHub):

```bash
bash scripts/package-desktop.sh 0.2.0
```

**Create GitHub release from local builds** (you must have built all platforms yourself, or only attach what you built):

```bash
gh auth login
bash scripts/release.sh 0.2.0
```

**Package step only:**

```bash
bash scripts/release.sh --package-only 0.2.0
```

### GitHub CLI

```bash
bash scripts/install-gh.sh
export PATH="$HOME/.local/bin:$PATH"
gh auth login
```

In CI, `GITHUB_TOKEN` is provided automatically with `contents: write`.

## Code signing (optional)

For production macOS / Windows builds, set GitHub repository secrets (same names as local env vars). See [`apps/desktop/docs/07-build-and-package.md`](../apps/desktop/docs/07-build-and-package.md).

| Secret                                                                                     | Platform |
| ------------------------------------------------------------------------------------------ | -------- |
| `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | macOS    |
| `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`                                                     | Windows  |

Unsigned builds still run in CI; users may see OS security prompts.

## Root scripts

| Command                             | Description                         |
| ----------------------------------- | ----------------------------------- |
| `pnpm run release:ship -- 0.2.0`    | Tag + push (runs `ship-release.sh`) |
| `pnpm run release:package -- 0.2.0` | `dist/` + SHA256 only               |
| `pnpm run release:publish -- 0.2.0` | Package + `gh release create`       |

## Troubleshooting

**Release already exists** — Delete or use a new version:

```bash
gh release delete v0.2.0 --yes
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0
```

**Workflow did not run** — Tag must be `v*` and pushed to GitHub: `git push origin v0.2.0`.

**Missing platform asset** — Check the failed matrix job (macOS / Windows / Linux). Re-run the workflow after fixing.

**Working tree not clean** — Commit or stash changes before `ship-release.sh`.
