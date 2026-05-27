# Getting started

## Prerequisites

- **Node.js** ≥ 20.19 (or ≥ 22.12) — `electron-vite` requirement
- **npm** ≥ 10 (or pnpm / yarn / bun — your CLI already chose one for you)
- **Python 3** + **C/C++ toolchain** — only needed if you picked `better-sqlite3`
  (`node-gyp` uses them to compile the native binding)
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Windows: `npm config set msvs_version 2022` and install VS Build Tools
  - Linux: `build-essential python3`

## First run

```bash
npm install
npm run dev
```

You should see:

- Vite dev server at `http://localhost:5173`
- Electron window with a left sidebar and the **Home** page showing the app version + platform (pulled over IPC).

## Project tour — where to look first

| You want to…              | Start here                                                                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a new IPC channel     | [`src/shared/ipc-contract.ts`](../src/shared/ipc-contract.ts) + [docs/03-ipc.md](./03-ipc.md)                                                                                                       |
| Call an HTTP API          | [`src/renderer/src/features/posts/usePostsQuery.ts`](../src/renderer/src/features/posts/usePostsQuery.ts)                                                                                           |
| Persist something locally | [docs/04-storage.md](./04-storage.md)                                                                                                                                                               |
| Add a new route           | [`src/renderer/src/router.tsx`](../src/renderer/src/router.tsx) (React Router _or_ TanStack Router — chosen when you ran `create-era-next`; see `router-variants/` in the upstream repo to compare) |
| Pick a different router   | Scaffold with `--router react-router-dom` or `--router tanstack-router` (non-interactive), or re-run the CLI on a fresh folder                                                                      |
| Change formatter stack    | New folder: `--formatter oxfmt` or `--formatter prettier`. Lint stays oxlint either way.                                                                                                            |
| Add a new language        | [docs/06-i18n.md](./06-i18n.md)                                                                                                                                                                     |
| Build installers          | [docs/07-build-and-package.md](./07-build-and-package.md)                                                                                                                                           |
| Publish an auto-update    | [docs/08-auto-update.md](./08-auto-update.md)                                                                                                                                                       |

## Troubleshooting

**`better-sqlite3` fails to load with `NODE_MODULE_VERSION` mismatch**
Run `npx electron-builder install-app-deps`. It rebuilds native modules against
the Electron-specific Node ABI. This also runs automatically in `postinstall`.

**Renderer shows a blank window in production**
Check that `out/renderer/index.html` exists after `npm run build`. If the file
isn't there, your `electron.vite.config.ts` renderer input is misconfigured.

**Dev server can't connect**
Kill anything on port 5173 (`lsof -i :5173` on macOS/Linux) or change the port
in `electron.vite.config.ts`.
