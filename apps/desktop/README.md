# desktop

> Generated with [`create-era-next`](https://www.npmjs.com/package/create-era-next).

Modern Electron + React + TypeScript + Vite boilerplate with typed IPC, auto-updates, local storage, Axios + React Query, Tailwind, i18n, and tests.

## Quick start

```bash
npm install
npm run dev
```

## Scripts

| Script                  | What it does                                                 |
| ----------------------- | ------------------------------------------------------------ |
| `npm run dev`           | Start Vite dev server + Electron with HMR                    |
| `npm run build`         | Bundle main / preload / renderer to `out/`                   |
| `npm run typecheck`     | TypeScript check (no emit)                                   |
| `npm run lint`          | **oxlint** (React + Vitest plugins)                          |
| `npm run lint:fix`      | oxlint with `--fix`                                          |
| `npm run format`        | **oxfmt** (write)                                            |
| `npm run format:check`  | oxfmt check only (CI)                                        |
| `npm test`              | Vitest unit tests                                            |
| `npm run test:e2e`      | Playwright smoke test against the built app                  |
| `npm run package`       | Package the app for the current OS (no publish)              |
| `npm run package:mac`   | Package for macOS                                            |
| `npm run package:win`   | Package for Windows                                          |
| `npm run package:linux` | Package for Linux                                            |
| `npm run release`       | Build + publish installers to GitHub Releases (CI uses this) |

**Router:** Only one of `react-router-dom` or `@tanstack/react-router` is installed — the CLI removed the other when this app was generated. To use the other stack on a new project: `npx create-era-next my-app --router tanstack-router` or `--router react-router-dom`.

**Formatter:** Either **oxfmt** or **prettier** is configured — the other was removed at scaffold time. Switching later: add the tool + config yourself, or scaffold a new app with `--formatter prettier` / `--formatter oxfmt`.

## Project structure

```
src/
├─ main/         Electron main process (Node)
│  ├─ ipc/        Typed IPC handlers (one file per domain)
│  ├─ storage/    Storage backend (electron-store OR SQLite)
│  └─ updater.ts  electron-updater wiring
├─ preload/      contextBridge exposing a typed `window.api`
├─ shared/       Types shared between main, preload and renderer
│  └─ ipc-contract.ts   ← single source of truth for every IPC channel
└─ renderer/     React + Vite app
   ├─ src/
   │  ├─ components/    UI chrome
   │  ├─ features/      One folder per product surface (Home, Posts, Settings, About)
   │  ├─ hooks/         useIpc, useUpdater
   │  ├─ i18n/          i18next setup + locales
   │  └─ lib/           axios, query-client
   └─ index.html
```

## Documentation

See the [`docs/`](./docs) folder:

1. [Getting started](./docs/01-getting-started.md)
2. [Architecture](./docs/02-architecture.md)
3. [IPC (adding a channel)](./docs/03-ipc.md)
4. [Storage](./docs/04-storage.md)
5. [API data (Axios + React Query)](./docs/05-api-data.md)
6. [i18n](./docs/06-i18n.md)
7. [Build & package](./docs/07-build-and-package.md)
8. [Auto-update](./docs/08-auto-update.md)
9. [Migrating from ERB](./docs/10-migration-from-erb.md)

## License

MIT
