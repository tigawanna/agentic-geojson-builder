#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/apps/desktop"
VERSION="${1:-$(node -p "require('$DESKTOP_DIR/package.json').version")}"
DEB="$DESKTOP_DIR/release/$VERSION/agentic-geojson-builder_${VERSION}_amd64.deb"

if [ ! -f "$DEB" ]; then
  echo "==> Building Linux package (version $VERSION)"
  pnpm --filter ./apps/desktop run package:linux
fi

if [ ! -f "$DEB" ]; then
  echo "ERROR: Installer not found: $DEB" >&2
  exit 1
fi

echo "==> Installing $DEB"
sudo dpkg -i "$DEB"

echo "==> Done. Launch Agentic GeoJSON Builder from your app menu."
