#!/usr/bin/env bash
set -euo pipefail

repo_name="${1:-world-cup}"
pages_branch="${PAGES_BRANCH:-gh-pages}"
pages_path="${PAGES_PATH:-/docs}"

if ! command -v gh >/dev/null 2>&1; then
  printf 'error: gh CLI is required. Install and authenticate with `gh auth login`.\n' >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  printf 'error: git is required.\n' >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
cd "$repo_root"

if ! gh auth status >/dev/null 2>&1; then
  printf 'error: gh is not authenticated. Run `gh auth login` first.\n' >&2
  exit 1
fi

if git show-ref --verify --quiet refs/heads/master; then
  primary_branch="master"
elif git show-ref --verify --quiet refs/heads/main; then
  primary_branch="main"
else
  printf 'error: expected a local master or main branch.\n' >&2
  exit 1
fi

if ! git show-ref --verify --quiet "refs/heads/${pages_branch}"; then
  printf 'error: expected local branch %s.\n' "$pages_branch" >&2
  exit 1
fi

if ! git ls-tree -d --name-only "${pages_branch}" | grep -qx 'docs'; then
  printf 'error: expected %s branch to contain a docs/ directory.\n' "$pages_branch" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  printf 'note: working tree has uncommitted changes; only committed branch history will be pushed.\n'
fi

if git remote get-url origin >/dev/null 2>&1; then
  printf 'using existing origin: %s\n' "$(git remote get-url origin)"
else
  printf 'creating public GitHub repo: %s\n' "$repo_name"
  gh repo create "$repo_name" --public --source=. --remote=origin
fi

printf 'pushing %s and %s...\n' "$primary_branch" "$pages_branch"
git push -u origin "$primary_branch"
git push -u origin "$pages_branch"

name_with_owner="$(gh repo view --json nameWithOwner -q .nameWithOwner)"

printf 'setting default branch to %s...\n' "$primary_branch"
gh api \
  --method PATCH \
  -H "Accept: application/vnd.github+json" \
  "repos/${name_with_owner}" \
  -f "default_branch=${primary_branch}" >/dev/null

payload="$(mktemp)"
trap 'rm -f "$payload"' EXIT
printf '{"source":{"branch":"%s","path":"%s"}}\n' "$pages_branch" "$pages_path" > "$payload"

if gh api "repos/${name_with_owner}/pages" >/dev/null 2>&1; then
  printf 'updating GitHub Pages source to %s:%s...\n' "$pages_branch" "$pages_path"
  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "repos/${name_with_owner}/pages" \
    --input "$payload" >/dev/null
else
  printf 'creating GitHub Pages site from %s:%s...\n' "$pages_branch" "$pages_path"
  gh api \
    --method POST \
    -H "Accept: application/vnd.github+json" \
    "repos/${name_with_owner}/pages" \
    --input "$payload" >/dev/null
fi

owner="${name_with_owner%%/*}"
repo="${name_with_owner#*/}"

printf '\nrepo:  https://github.com/%s\n' "$name_with_owner"
printf 'pages: https://%s.github.io/%s/\n' "$owner" "$repo"
printf '\nGitHub Pages may take a minute or two to build the first time.\n'
