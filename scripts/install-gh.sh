#!/usr/bin/env bash
set -euo pipefail

GH_VERSION="${GH_VERSION:-2.63.2}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) GH_ARCH=amd64 ;;
  aarch64|arm64) GH_ARCH=arm64 ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$OS" in
  darwin) TARBALL="gh_${GH_VERSION}_macOS_${GH_ARCH}.tar.gz" ;;
  *) TARBALL="gh_${GH_VERSION}_linux_${GH_ARCH}.tar.gz" ;;
esac
URL="https://github.com/cli/cli/releases/download/v${GH_VERSION}/${TARBALL}"

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

echo "==> Downloading gh $GH_VERSION"
curl -fsSL -o "$tmpdir/gh.tgz" "$URL"
tar -xzf "$tmpdir/gh.tgz" -C "$tmpdir"
mkdir -p "$INSTALL_DIR"
case "$OS" in
  darwin) GH_DIR="gh_${GH_VERSION}_macOS_${GH_ARCH}" ;;
  *) GH_DIR="gh_${GH_VERSION}_linux_${GH_ARCH}" ;;
esac
install -m 755 "$tmpdir/${GH_DIR}/bin/gh" "$INSTALL_DIR/gh"
echo "==> Installed: $INSTALL_DIR/gh"
"$INSTALL_DIR/gh" --version
