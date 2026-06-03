#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/apps/desktop"
DIST_DIR="$ROOT_DIR/dist"

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  VERSION=$(node -p "require('$DESKTOP_DIR/package.json').version")
fi

collect_from_dir() {
  local src="$1"
  [ -d "$src" ] || return 0
  while IFS= read -r -d '' f; do
    cp -f "$f" "$DIST_DIR/"
  done < <(
    find "$src" -type f \( \
      -iname '*.dmg' -o -iname '*.zip' -o -iname '*.exe' -o \
      -iname '*.AppImage' -o -iname '*.deb' -o -iname '*.blockmap' \
    \) -print0 2>/dev/null || true
  )
}

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

if [ -n "${ARTIFACTS_DIR:-}" ]; then
  echo "==> Collecting installers from $ARTIFACTS_DIR"
  collect_from_dir "$ARTIFACTS_DIR"
elif [ -n "${ARTIFACT_DIRS:-}" ]; then
  for dir in $ARTIFACT_DIRS; do
    echo "==> Collecting installers from $dir"
    collect_from_dir "$dir"
  done
else
  RELEASE_DIR="$DESKTOP_DIR/release/$VERSION"
  echo "==> Collecting installers from $RELEASE_DIR"
  collect_from_dir "$RELEASE_DIR"
fi

if [ -z "$(find "$DIST_DIR" -maxdepth 1 -type f ! -name 'SHA256SUMS' -print -quit 2>/dev/null)" ]; then
  echo ""
  echo "ERROR: No installers found."
  echo "  Build first: pnpm --filter ./apps/desktop run package:mac (or :win / :linux)"
  echo "  Or set ARTIFACTS_DIR / ARTIFACT_DIRS for CI artifact merge"
  exit 1
fi

echo ""
echo "==> Generating checksums"
(
  cd "$DIST_DIR"
  sha256sum * > SHA256SUMS
)
cat "$DIST_DIR/SHA256SUMS"

echo ""
echo "==> Packaged to $DIST_DIR/"
ls -lh "$DIST_DIR"
