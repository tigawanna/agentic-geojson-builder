# Build & package

Packaging is handled by [electron-builder](https://www.electron.build/). Config
lives in [`electron-builder.yml`](../electron-builder.yml).

## Local builds

```bash
# Current OS
npm run package

# Specific targets
npm run package:mac     # .dmg + .zip (arm64 + x64)
npm run package:win     # NSIS .exe installer + portable .exe
npm run package:linux   # AppImage + .deb
```

Output lands in `release/<version>/`.

## Build from source (Linux)

From the monorepo root:

```bash
pnpm install
pnpm --filter ./apps/desktop run package:linux
```

Installers are written to `apps/desktop/release/<version>/`:

- `agentic-geojson-builder_<version>_amd64.deb`
- `Agentic GeoJSON Builder-<version>-x86_64.AppImage`

Install or uninstall with the helper scripts:

```bash
bash scripts/install-desktop-linux.sh
bash scripts/uninstall-desktop-linux.sh
```

Pass a version to install a specific build:

```bash
bash scripts/install-desktop-linux.sh 0.1.0
```

Remove the app and delete its config directory:

```bash
bash scripts/uninstall-desktop-linux.sh --purge
```

Manual install:

```bash
sudo dpkg -i apps/desktop/release/0.1.0/agentic-geojson-builder_0.1.0_amd64.deb
sudo dpkg -r agentic-geojson-builder
```

App icons and store screenshots live in [`build/`](../build/) — see [Icons](#icons) below.

## Icons

Place these files in [`build/`](../build/):

- `icon.icns` — macOS (1024×1024 ICNS)
- `icon.ico` — Windows (multi-resolution ICO)
- `icon.png` — Linux (512×512 PNG)

Generate them all from a single 1024×1024 PNG:

```bash
npx electron-icon-builder --input=./build/icon.png --output=./build
```

## macOS code signing + notarization

Set these env vars before `npm run release`:

| Var                           | Value                                        |
| ----------------------------- | -------------------------------------------- |
| `APPLE_ID`                    | Your Apple developer account email           |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from appleid.apple.com |
| `APPLE_TEAM_ID`               | 10-char team id from developer.apple.com     |
| `CSC_LINK`                    | Path or base64 of your `.p12` certificate    |
| `CSC_KEY_PASSWORD`            | Password for the `.p12`                      |

electron-builder will automatically sign + notarize when all five are set.

The [release workflow](../../../.github/workflows/release.yml) reads them from
GitHub Secrets of the same names.

## GitHub releases

See the monorepo guide: [`docs/desktop-release.md`](../../../docs/desktop-release.md).

**Ship a version** (tag + CI build + GitHub Release):

```bash
# from monorepo root
bash scripts/ship-release.sh 0.2.0
# or: pnpm run release:ship -- 0.2.0
```

**CI only** (no publish): push to `main` runs [ci.yml](../../../.github/workflows/ci.yml).
**Publish**: push tag `v0.2.0` or run the **Release** workflow manually.

## Windows code signing

| Var                    | Value                         |
| ---------------------- | ----------------------------- |
| `WIN_CSC_LINK`         | Path or base64 of your `.pfx` |
| `WIN_CSC_KEY_PASSWORD` | Password for the `.pfx`       |

## Linux

No signing needed for `.deb` / `.AppImage`. If you want Snap or Flatpak,
extend the `linux.target` array in `electron-builder.yml`.

## What goes into the app bundle?

electron-builder only packages:

- `out/**` (built by electron-vite)
- `package.json` (minus `devDependencies` — those are stripped automatically)
- `node_modules` of **production** deps (resolved by reading `package.json`)
- Any entries in `extraResources`

Native modules (e.g. `better-sqlite3`) are rebuilt against Electron's Node ABI
by `install-app-deps` (already wired into `postinstall`) and unpacked from the
asar archive via the `asarUnpack` config.
