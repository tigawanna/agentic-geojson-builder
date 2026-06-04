#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME="agentic-geojson-builder"
PURGE=false

for arg in "$@"; do
  case "$arg" in
    --purge)
      PURGE=true
      ;;
    -h | --help)
      echo "Usage: bash scripts/uninstall-desktop-linux.sh [--purge]"
      echo "  --purge  Remove the package and its configuration under ~/.config/$PACKAGE_NAME"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if pgrep -f "/opt/Agentic GeoJSON Builder/agentic-geojson-builder" >/dev/null 2>&1; then
  echo "==> Stopping running app instances"
  pkill -f "/opt/Agentic GeoJSON Builder/agentic-geojson-builder" || true
  sleep 1
fi

if ! dpkg-query -W -f='${Status}' "$PACKAGE_NAME" 2>/dev/null | grep -q "install ok installed"; then
  echo "Package $PACKAGE_NAME is not installed."
  exit 0
fi

if [ "$PURGE" = true ]; then
  echo "==> Purging $PACKAGE_NAME"
  sudo dpkg --purge "$PACKAGE_NAME"
else
  echo "==> Removing $PACKAGE_NAME"
  sudo dpkg -r "$PACKAGE_NAME"
fi

echo "==> Done."
