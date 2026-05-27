# Auto-update

This template uses [`electron-updater`](https://www.electron.build/auto-update)
with **GitHub Releases** as the default provider.

## How it works

1. `electron-builder` publishes installers + a `latest.yml` / `latest-mac.yml`
   / `latest-linux.yml` feed to your GitHub Releases page.
2. On boot (5s delay), the packaged app calls `autoUpdater.checkForUpdates()`.
3. If a newer version exists, the main process sends `updater:status` events
   to the renderer, where the `<UpdateToast>` component offers
   **Download** → **Restart & install**.

## First-time setup

1. In `electron-builder.yml`, `publish.owner` and `publish.repo` are already
   filled in by the CLI. Double-check they point at your actual GitHub repo.
2. Add a `GITHUB_TOKEN` (or Personal Access Token with `repo` scope) as a
   repo secret named `GITHUB_TOKEN` — the default `GITHUB_TOKEN` provided by
   Actions is already sufficient (see [release.yml](../.github/workflows/release.yml)).
3. Commit, then tag:

   ```bash
   npm version minor       # e.g. 0.1.0 → 0.2.0
   git push --follow-tags
   ```

   The `Release` workflow builds on macOS/Windows/Linux and uploads everything
   to a Release matching the tag. `electron-updater` will discover the feed on
   the next `checkForUpdates()` call.

## Testing updates locally

You can't test against GitHub Releases without publishing. Two options:

### Option A — local HTTP server with a generic provider

1. Temporarily switch `publish.provider` in `electron-builder.yml` to
   `generic` with `url: http://localhost:8080`.
2. Build twice (bump the `version` in `package.json` between builds) and point
   a static server at `release/*/`:

   ```bash
   npx serve release -p 8080
   ```

3. Run the older build. It will fetch `http://localhost:8080/latest.yml` and
   discover the newer version.

### Option B — dev-mode `dev-app-update.yml`

Place this next to `package.json`:

```yaml
provider: generic
url: http://localhost:8080
```

Then `process.env.NODE_ENV = 'development'` + `autoUpdater.forceDevUpdateConfig = true`
makes electron-updater use it even in dev. Good for end-to-end manual QA.

## Release cadence tips

- Keep `autoDownload = false` (it is in
  [`src/main/updater.ts`](../src/main/updater.ts)). Let users opt-in so slow
  connections don't get surprised.
- Keep `autoInstallOnAppQuit = true` — installs silently when the user next
  quits the app.
- For urgent hotfixes, call `autoUpdater.downloadUpdate()` immediately after
  `update-available` fires.

## Rollback

GitHub Releases keeps every past version. To roll back:

1. Mark the bad release as **pre-release** in the GitHub UI — `electron-updater`
   skips pre-releases by default.
2. Cut a new tag with a higher version that restores the previous code.

Never reuse a version number — electron-updater uses `latest.yml`'s version
field to decide whether an update is "newer".
