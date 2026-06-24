#!/usr/bin/env bash
set -euo pipefail

pages_branch="${PAGES_BRANCH:-gh-pages}"
message="${1:-Trigger GitHub Pages rebuild}"

if ! command -v git >/dev/null 2>&1; then
  printf 'error: git is required.\n' >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
cd "$repo_root"

if ! git remote get-url origin >/dev/null 2>&1; then
  printf 'error: origin remote is not configured.\n' >&2
  exit 1
fi

if ! git show-ref --verify --quiet "refs/heads/${pages_branch}"; then
  printf 'error: local branch not found: %s\n' "$pages_branch" >&2
  exit 1
fi

current_branch="$(git branch --show-current)"
if [ "$current_branch" != "$pages_branch" ]; then
  if [ -n "$(git status --porcelain)" ]; then
    printf 'error: working tree has uncommitted changes; switch to %s yourself or commit/stash first.\n' "$pages_branch" >&2
    exit 1
  fi
  git switch "$pages_branch"
fi

git commit --allow-empty -m "$message"
git push origin "$pages_branch"

printf 'pushed empty commit to %s. Watch the Pages build here:\n' "$pages_branch"
printf 'https://github.com/%s/actions\n' "$(git remote get-url origin | sed -E 's#^git@github.com:##; s#^https://github.com/##; s#\\.git$##')"
