#!/usr/bin/env bash
set -euo pipefail

repo="${1:-}"
pages_branch="${PAGES_BRANCH:-gh-pages}"
pages_path="${PAGES_PATH:-/docs}"

if ! command -v gh >/dev/null 2>&1; then
  printf 'error: gh CLI is required. Install and authenticate with `gh auth login`.\n' >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  printf 'error: gh is not authenticated. Run `gh auth login` first.\n' >&2
  exit 1
fi

if [ -z "$repo" ]; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
  else
    printf 'error: pass a repo as owner/name, for example:\n' >&2
    printf '  %s k7lim/world-cup-knockout-scenarios\n' "$0" >&2
    exit 1
  fi
fi

if ! gh api "repos/${repo}" >/dev/null; then
  printf 'error: repo not found or inaccessible: %s\n' "$repo" >&2
  exit 1
fi

if ! gh api "repos/${repo}/branches/${pages_branch}" >/dev/null; then
  printf 'error: branch not found on GitHub: %s\n' "$pages_branch" >&2
  exit 1
fi

if ! gh api "repos/${repo}/contents${pages_path}?ref=${pages_branch}" >/dev/null; then
  printf 'error: path not found on %s: %s\n' "$pages_branch" "$pages_path" >&2
  exit 1
fi

payload="$(mktemp)"
trap 'rm -f "$payload"' EXIT
printf '{"source":{"branch":"%s","path":"%s"}}\n' "$pages_branch" "$pages_path" > "$payload"

if gh api "repos/${repo}/pages" >/dev/null 2>&1; then
  printf 'updating GitHub Pages source for %s to %s:%s...\n' "$repo" "$pages_branch" "$pages_path"
  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "repos/${repo}/pages" \
    --input "$payload" >/dev/null
else
  printf 'creating GitHub Pages site for %s from %s:%s...\n' "$repo" "$pages_branch" "$pages_path"
  gh api \
    --method POST \
    -H "Accept: application/vnd.github+json" \
    "repos/${repo}/pages" \
    --input "$payload" >/dev/null
fi

owner="${repo%%/*}"
name="${repo#*/}"

printf 'configured source: %s:%s\n' "$pages_branch" "$pages_path"
printf 'site URL: https://%s.github.io/%s/\n' "$owner" "$name"
printf 'A new Pages build may take a minute or two to finish.\n'
