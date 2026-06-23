#!/usr/bin/env bash
set -euo pipefail

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'error: required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

load_dotenv() {
  local env_file="${1:-.env}"
  [ -f "$env_file" ] || return 0

  printf 'loading secret values from %s when not already set...\n' "$env_file"
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
      case "$key" in
        THE_ODDS_API_KEY|ODDS_API_IO_KEY|ODDS_API_IO_BASE)
          if [ -z "${!key:-}" ]; then
            if [[ "$value" == \"*\" && "$value" == *\" ]]; then
              value="${value:1:${#value}-2}"
            elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
              value="${value:1:${#value}-2}"
            fi
            export "$key=$value"
          fi
          ;;
      esac
    fi
  done < "$env_file"
}

set_secret_if_present() {
  local name="$1"
  local value="${!name:-}"
  if [ -z "$value" ]; then
    printf 'skipping %s; value is not set.\n' "$name"
    return 0
  fi
  printf 'setting %s repo secret...\n' "$name"
  gh secret set "$name" --repo "$repo" --body "$value" >/dev/null
}

set_variable_if_present() {
  local name="$1"
  local value="${!name:-}"
  if [ -z "$value" ]; then
    printf 'skipping %s; value is not set.\n' "$name"
    return 0
  fi
  printf 'setting %s repo variable...\n' "$name"
  gh variable set "$name" --repo "$repo" --body "$value" >/dev/null
}

need gh
need git

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
cd "$repo_root"

if ! gh auth status >/dev/null 2>&1; then
  printf 'error: gh is not authenticated. Run `gh auth login` first.\n' >&2
  exit 1
fi

repo="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
load_dotenv .env

set_secret_if_present THE_ODDS_API_KEY
set_secret_if_present ODDS_API_IO_KEY
set_variable_if_present ODDS_API_IO_BASE

printf 'GitHub Actions secret sync complete for %s.\n' "$repo"
