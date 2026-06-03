#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
DESKTOP_DIR="$ROOT_DIR/apps/desktop"

usage() {
  cat <<EOF
Usage: $0 [options] <version>

Package desktop installers into dist/ and create a GitHub release.

Options:
  --yes            Skip confirmation prompt
  --draft          Create a draft release
  --package-only   Only package; do not publish to GitHub

Environment:
  GITHUB_TOKEN     Token for gh (required in CI if not logged in)
  ARTIFACTS_DIR    Directory of CI-downloaded artifacts (optional)
  ARTIFACT_DIRS    Space-separated artifact roots (optional)
  DESKTOP_VERSION  Default version when omitted

Examples:
  $0 0.2.0
  $0 --yes 0.2.0
  ARTIFACTS_DIR=./artifacts $0 --yes 0.2.0
EOF
}

CONFIRM=no
DRAFT=
PACKAGE_ONLY=0
VERSION=""

if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
  CONFIRM=yes
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y) CONFIRM=yes; shift ;;
    --no|-n) CONFIRM=no; shift ;;
    --draft) DRAFT=--draft; shift ;;
    --package-only) PACKAGE_ONLY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [ -n "$VERSION" ]; then
        echo "Unexpected argument: $1" >&2
        exit 1
      fi
      VERSION="$1"
      shift
      ;;
  esac
done

if [ -z "$VERSION" ]; then
  VERSION="${DESKTOP_VERSION:-}"
fi
if [ -z "$VERSION" ]; then
  VERSION=$(node -p "require('$DESKTOP_DIR/package.json').version")
fi

"$SCRIPT_DIR/package-desktop.sh" "$VERSION"

if [ "$PACKAGE_ONLY" -eq 1 ]; then
  exit 0
fi

if ! command -v gh &>/dev/null; then
  echo ""
  echo "ERROR: GitHub CLI (gh) is required to publish."
  echo "  Install: bash scripts/install-gh.sh"
  echo "       or: sudo apt install gh"
  echo "  Then:   gh auth login"
  exit 1
fi

if [ -n "${GITHUB_TOKEN:-}" ]; then
  export GH_TOKEN="$GITHUB_TOKEN"
fi

if ! gh auth status &>/dev/null 2>&1; then
  echo ""
  echo "ERROR: Not authenticated with GitHub CLI."
  echo "  Local:  gh auth login"
  echo "  CI:     set GITHUB_TOKEN with contents: write permission"
  exit 1
fi

TAG="v${VERSION}"
PRODUCT_NAME=$(node -p "require('$DESKTOP_DIR/package.json').description || 'Desktop'")

if gh release view "$TAG" &>/dev/null 2>&1; then
  echo ""
  echo "ERROR: Release $TAG already exists."
  echo "  Delete it first: gh release delete $TAG --yes"
  exit 1
fi

REPO_URL=$(gh repo view --json url -q .url 2>/dev/null || echo "")
if [ -n "$REPO_URL" ]; then
  README_LINK="${REPO_URL}/blob/main/docs/desktop-release.md"
  BUILD_DOC_LINK="${REPO_URL}/blob/main/apps/desktop/docs/07-build-and-package.md"
else
  README_LINK="docs/desktop-release.md"
  BUILD_DOC_LINK="apps/desktop/docs/07-build-and-package.md"
fi

RELEASE_NOTES=$(cat <<EOF
## ${PRODUCT_NAME} ${VERSION}

Desktop builds for macOS, Windows, and Linux (when produced by CI).

### Downloads
Installers and update metadata (\`.blockmap\`) are attached below. Verify with \`SHA256SUMS\`.

### Auto-update
The app uses \`electron-updater\`; published releases on this tag are picked up by in-app updates when configured.

### Build from source
See [desktop release guide](${README_LINK}) and [build & package](${BUILD_DOC_LINK}).
EOF
)

echo ""
echo "==> Release assets in $DIST_DIR:"
ls -lh "$DIST_DIR"

echo ""
if [ "$CONFIRM" = "no" ] && [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ]; then
  read -rp "Proceed with GitHub release $TAG? [y/N] " answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    echo "Aborted. Artifacts remain in dist/"
    exit 0
  fi
fi

GH_ARGS=(release create "$TAG" --title "${PRODUCT_NAME} ${VERSION}" --notes "$RELEASE_NOTES")
if [ -n "$DRAFT" ]; then
  GH_ARGS+=("$DRAFT")
fi

for f in "$DIST_DIR"/*; do
  base=$(basename "$f")
  [ "$base" = "SHA256SUMS" ] && continue
  case "$base" in
    *.dmg) GH_ARGS+=("$f#macOS disk image") ;;
    *.zip) GH_ARGS+=("$f#macOS archive") ;;
    *Setup*.exe|*setup*.exe) GH_ARGS+=("$f#Windows installer") ;;
    *.exe) GH_ARGS+=("$f#Windows portable") ;;
    *.AppImage) GH_ARGS+=("$f#Linux AppImage") ;;
    *.deb) GH_ARGS+=("$f#Linux deb") ;;
    *.blockmap) GH_ARGS+=("$f#Update block map") ;;
    *) GH_ARGS+=("$f") ;;
  esac
done
GH_ARGS+=("$DIST_DIR/SHA256SUMS#SHA256 checksums")

echo ""
echo "==> Creating GitHub release: $TAG"
gh "${GH_ARGS[@]}"

echo ""
if [ -n "$REPO_URL" ]; then
  echo "==> Release published: $REPO_URL/releases/tag/$TAG"
else
  echo "==> Release published: $TAG"
fi
