#!/usr/bin/env bash
set -euo pipefail

pages_branch="${PAGES_BRANCH:-gh-pages}"
pages_path="${PAGES_PATH:-/docs}"
commit_message="${DEPLOY_COMMIT_MESSAGE:-Bundle static predictions for GitHub Pages}"
workflow_message="${WORKFLOW_COMMIT_MESSAGE:-Install static data refresh workflow}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'error: required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

run() {
  printf '+ %s\n' "$*"
  "$@"
}

need git
need gh
need npm
need node

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
cd "$repo_root"

if ! gh auth status >/dev/null 2>&1; then
  printf 'error: gh is not authenticated. Run `gh auth login` first.\n' >&2
  exit 1
fi

repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
default_branch="$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)"
current_branch="$(git branch --show-current)"

if [ "$current_branch" != "$pages_branch" ]; then
  if [ -n "$(git status --porcelain)" ]; then
    printf 'error: working tree has changes; commit/stash them or switch to %s yourself.\n' "$pages_branch" >&2
    exit 1
  fi
  run git switch "$pages_branch"
fi

printf 'repo: %s\n' "$repo"
printf 'pages branch: %s\n' "$pages_branch"
printf 'default branch: %s\n' "$default_branch"

run npm test
run npm run export:static

node <<'NODE'
const fs = require("fs");
const seed = JSON.parse(fs.readFileSync("docs/data/world-cup-2026-seed.json", "utf8"));
const predictions = Object.keys(seed.predictions || {}).length;
const evidence = Object.keys(seed.marketEvidence || {}).length;
const pending = (seed.fixtures || []).filter((fixture) => {
  const locked = ["FT", "AET", "PEN", "AWD", "WO"].includes(fixture.statusShort) &&
    fixture.goals?.home !== null &&
    fixture.goals?.away !== null;
  return !locked && !seed.predictions?.[fixture.id];
});
if (seed.groups?.length !== 12 || seed.fixtures?.length !== 72) {
  throw new Error("static seed is missing expected groups or fixtures");
}
if (!predictions || predictions !== evidence) {
  throw new Error(`prediction/evidence mismatch: ${predictions}/${evidence}`);
}
if (pending.length) {
  throw new Error(`${pending.length} unresolved fixtures lack predictions`);
}
console.log(`static seed ok: ${seed.fixtures.length} fixtures, ${predictions} predictions`);
NODE

if grep -R -n 'href="/\|src="/\|"/data/\|"/api/' docs/index.html docs/app.js; then
  printf 'error: docs artifact still has root-relative Pages paths or API calls.\n' >&2
  exit 1
fi

deploy_paths=(
  data/world-cup-2026-seed.json
  docs
  justfile
  package.json
  public/app.js
  server.js
  scripts/export-static-site.js
  scripts/sync-github-secrets.sh
  scripts/deploy-github-pages.sh
  test/predictions.test.js
  test/static-export.test.js
  .github/workflows/refresh-static-site.yml
)

existing_paths=()
for path in "${deploy_paths[@]}"; do
  if [ -e "$path" ]; then
    existing_paths+=("$path")
  fi
done

run git add "${existing_paths[@]}"
if git diff --cached --quiet; then
  printf 'no Pages data/code changes to commit on %s.\n' "$pages_branch"
else
  run git commit -m "$commit_message"
fi

run git push origin "$pages_branch"

payload="$(mktemp)"
trap 'rm -f "$payload"; if [ -n "${workflow_worktree:-}" ]; then git worktree remove --force "$workflow_worktree" >/dev/null 2>&1 || true; fi' EXIT
printf '{"source":{"branch":"%s","path":"%s"}}\n' "$pages_branch" "$pages_path" > "$payload"

if gh api "repos/${repo}/pages" >/dev/null 2>&1; then
  current_pages_branch="$(gh api "repos/${repo}/pages" --jq '.source.branch // ""')"
  current_pages_path="$(gh api "repos/${repo}/pages" --jq '.source.path // ""')"
  if [ "$current_pages_branch:$current_pages_path" = "$pages_branch:$pages_path" ]; then
    printf 'GitHub Pages source already set to %s:%s.\n' "$pages_branch" "$pages_path"
  else
    printf 'updating GitHub Pages source to %s:%s...\n' "$pages_branch" "$pages_path"
    gh api --method PUT -H "Accept: application/vnd.github+json" "repos/${repo}/pages" --input "$payload" >/dev/null
  fi
else
  printf 'creating GitHub Pages source from %s:%s...\n' "$pages_branch" "$pages_path"
  gh api --method POST -H "Accept: application/vnd.github+json" "repos/${repo}/pages" --input "$payload" >/dev/null
fi

run bash scripts/sync-github-secrets.sh "$repo"

workflow_file=".github/workflows/refresh-static-site.yml"
workflow_worktree="$(mktemp -d)"
run git fetch origin "$default_branch"
run git worktree add "$workflow_worktree" "origin/$default_branch"
mkdir -p "$workflow_worktree/.github/workflows"
cp "$workflow_file" "$workflow_worktree/$workflow_file"
(
  cd "$workflow_worktree"
  git add "$workflow_file"
  if git diff --cached --quiet; then
    printf 'workflow already current on %s.\n' "$default_branch"
  else
    git config user.name "$(git -C "$repo_root" config user.name || printf 'github-pages-deploy')"
    git config user.email "$(git -C "$repo_root" config user.email || printf 'github-pages-deploy@users.noreply.github.com')"
    git commit -m "$workflow_message"
    git push origin "HEAD:${default_branch}"
  fi
)

owner="${repo%%/*}"
name="${repo#*/}"
printf '\ndeployed Pages artifact.\n'
printf 'site:    https://%s.github.io/%s/\n' "$owner" "$name"
printf 'actions: https://github.com/%s/actions/workflows/refresh-static-site.yml\n' "$repo"

if ! gh secret list --repo "$repo" | awk '{print $1}' | grep -qx THE_ODDS_API_KEY; then
  printf '\nwarning: THE_ODDS_API_KEY is not set as a repo secret; hourly odds refresh may not update markets.\n' >&2
  printf 'set it by rerunning with THE_ODDS_API_KEY in the environment, or use `gh secret set THE_ODDS_API_KEY --repo %s`.\n' "$repo" >&2
fi
