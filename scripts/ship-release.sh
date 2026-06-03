#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/apps/desktop"

usage() {
  cat <<EOF
Usage: $0 [options] [version]

Bump apps/desktop version (if needed), commit, create tag v<version>, and push.
GitHub Actions builds installers and publishes the release when the tag lands.

Options:
  --yes       Skip confirmation prompts
  --dry-run   Print actions without changing git or remote
  --no-push   Create tag locally only; do not push commit or tag

Examples:
  $0              Use version from apps/desktop/package.json
  $0 0.2.0        Set version to 0.2.0, then tag and push
  $0 --dry-run 0.2.0
EOF
}

CONFIRM=no
DRY_RUN=0
NO_PUSH=0
VERSION_ARG=""

while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y) CONFIRM=yes; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --no-push) NO_PUSH=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
    *)
      if [ -n "$VERSION_ARG" ]; then
        echo "Unexpected argument: $1" >&2
        exit 1
      fi
      VERSION_ARG="$1"
      shift
      ;;
  esac
done

if [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ]; then
  :
else
  CONFIRM=yes
fi

CURRENT=$(node -p "require('$DESKTOP_DIR/package.json').version")
VERSION="${VERSION_ARG:-$CURRENT}"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "ERROR: Version must be semver (e.g. 0.2.0), got: $VERSION" >&2
  exit 1
fi

TAG="v${VERSION}"

if ! git -C "$ROOT_DIR" rev-parse --git-dir &>/dev/null; then
  echo "ERROR: Not a git repository: $ROOT_DIR" >&2
  exit 1
fi

OTHER=$(git -C "$ROOT_DIR" status --porcelain | grep -v 'apps/desktop/package.json' || true)
if [ -n "$OTHER" ]; then
  echo "ERROR: Commit or stash unrelated changes before releasing:" >&2
  git -C "$ROOT_DIR" status --short >&2
  exit 1
fi

if [ "$VERSION" != "$CURRENT" ]; then
  echo "==> Setting apps/desktop version: $CURRENT -> $VERSION"
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "    (dry-run) npm version $VERSION --no-git-tag-version"
  else
    npm version "$VERSION" --no-git-tag-version --prefix "$DESKTOP_DIR"
  fi
fi

if [ "$DRY_RUN" -eq 0 ]; then
  if [ -n "$(git -C "$ROOT_DIR" status --porcelain apps/desktop/package.json 2>/dev/null)" ]; then
    git -C "$ROOT_DIR" add apps/desktop/package.json
    git -C "$ROOT_DIR" commit -m "chore(desktop): release ${TAG}"
  fi
fi

if git -C "$ROOT_DIR" rev-parse "$TAG" &>/dev/null 2>&1; then
  echo "ERROR: Tag $TAG already exists locally." >&2
  exit 1
fi

if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  if gh release view "$TAG" &>/dev/null 2>&1; then
    echo "ERROR: GitHub release $TAG already exists." >&2
    exit 1
  fi
fi

BRANCH=$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD)

echo ""
echo "==> Release plan"
echo "    Version:  $VERSION"
echo "    Tag:      $TAG"
echo "    Branch:   $BRANCH"
echo "    Push:     $([ "$NO_PUSH" -eq 1 ] && echo no || echo yes)"
echo ""
echo "    After push, GitHub Actions (.github/workflows/release.yml) will:"
echo "      - Build macOS, Windows, and Linux installers"
echo "      - Publish assets to GitHub Releases"
echo ""

if [ "$CONFIRM" = "no" ] && [ "$DRY_RUN" -eq 0 ]; then
  read -rp "Create tag and push to origin? [y/N] " answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "==> Dry run complete (no git or remote changes)."
  exit 0
fi

echo "==> Creating annotated tag $TAG"
git -C "$ROOT_DIR" tag -a "$TAG" -m "Desktop release ${VERSION}"

if [ "$NO_PUSH" -eq 1 ]; then
  echo "==> Tag created locally. Push when ready:"
  echo "    git push origin $BRANCH"
  echo "    git push origin $TAG"
  exit 0
fi

echo "==> Pushing branch and tag"
git -C "$ROOT_DIR" push origin "$BRANCH"
git -C "$ROOT_DIR" push origin "$TAG"

echo ""
echo "==> Tag $TAG pushed. Watch the release workflow:"
REPO=$(git -C "$ROOT_DIR" remote get-url origin 2>/dev/null | sed -E 's#.*github.com[:/](.+)(\.git)?$#\1#')
if [ -n "$REPO" ]; then
  echo "    https://github.com/${REPO}/actions/workflows/release.yml"
  echo "    https://github.com/${REPO}/releases/tag/${TAG}"
fi
