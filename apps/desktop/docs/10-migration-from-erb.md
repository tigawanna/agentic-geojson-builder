# Migrating from `electron-react-boilerplate` (ERB)

If you're moving an existing ERB app, here's the mental-model mapping.

## Build system

| ERB                             | create-era-next                                       |
| ------------------------------- | ----------------------------------------------------- |
| Webpack 5 + tons of configs     | `electron-vite` — single `electron.vite.config.ts`    |
| `erb.webpack.config.*.ts` files | Three sub-configs in one file (main/preload/renderer) |
| `webpack-dev-server`            | Vite dev server (HMR < 100ms)                         |

**Action**: Move your renderer source under `src/renderer/src/` and delete every
`webpack.*` file. `electron-vite` handles the rest.

## Project structure

| ERB                                                               | create-era-next                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| Monorepo with `src/main` + `src/renderer` + nested `package.json` | Single `package.json`, same `src/main` / `src/renderer` folders |
| `npm run start` (complex dev runner)                              | `npm run dev`                                                   |

electron-builder already filters production deps correctly, so the double
`package.json` setup from ERB is no longer needed.

## IPC

ERB leaves IPC typing up to you. Here you get:

- A contract file ([`src/shared/ipc-contract.ts`](../src/shared/ipc-contract.ts))
  mapping channel → `{ req, res }`.
- `useIpcQuery` / `useIpcMutation` hooks so IPC calls behave exactly like
  HTTP calls (cache, retries, invalidation).

**Migration**: find every `ipcRenderer.invoke('foo', ...)` / `ipcMain.handle('foo', ...)`
pair in your ERB app, add `'foo': { req: ...; res: ... }` to the contract, then
the compiler will show you every call site to tighten.

## Storage

ERB doesn't bundle one. You probably had `electron-store` or a hand-rolled
JSON file. Move your data to
[`src/main/storage/`](../src/main/storage/) — either backend works, and the
IPC surface is identical.

## Auto-update

ERB has a partial `electron-updater` setup. This boilerplate adds:

- A `useUpdater()` hook with status + actions
- An `<UpdateToast>` UI component
- A ready-made `.github/workflows/release.yml` that builds on all three OSes
  and publishes to GitHub Releases

**Migration**: copy these three things over and remove ERB's updater code.

## Lint / test / format

| ERB                            | create-era-next                                                            |
| ------------------------------ | -------------------------------------------------------------------------- |
| ESLint (`.eslintrc.*`, legacy) | **oxlint** (`.oxlintrc.json`) + React / Vitest plugins                     |
| Jest                           | Vitest (Vite-native, 10x faster)                                           |
| — (no e2e default)             | Playwright smoke test                                                      |
| Prettier                       | **Your choice**: **oxfmt** or **Prettier** (oxlint for lint in both cases) |
| Husky                          | Husky 9 (same)                                                             |

## Renderer libs

| ERB                     | create-era-next                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Plain CSS / your choice | Tailwind CSS 4 (via `@tailwindcss/vite`)                                                    |
| React Router (manual)   | **Your choice**: React Router v7 _or_ TanStack Router (hash history for Electron `file://`) |
| — (DIY)                 | i18next + `react-i18next`                                                                   |
| — (DIY)                 | Axios + TanStack Query v5 + Devtools                                                        |

## Likely gotchas

- **Node version**: Vite 7 / electron-vite 5 require Node ≥ 20.19. Bump your
  CI before you migrate.
- **ESM everywhere**: `"type": "module"` is on. Add `.js` extensions to relative
  imports in TS files that compile to ESM (`import x from './y.js'` — not
  `./y`).
- **Paths**: `@renderer/*`, `@main/*`, `@shared/*` replace ERB's verbose
  relative imports. Update tsconfig + vite config aliases.
