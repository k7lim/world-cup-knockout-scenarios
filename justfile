set shell := ["bash", "-euo", "pipefail", "-c"]

port := env_var_or_default("PORT", "5173")
url := "http://localhost:" + port
side := `if [ "${YOLOBOX:-}" = "1" ]; then printf yolobox; else printf host; fi`
state_dir := ".just"
pidfile := state_dir + "/server." + side + ".pid"
logfile := state_dir + "/server." + side + ".log"

default:
    @just --list

# Show the local commands.
list:
    @just --list

# Show runtime assumptions for this side of the sandbox boundary.
where:
    @printf 'side: %s\nproject: %s\nurl: %s\npidfile: %s\nlogfile: %s\n' "{{side}}" "$PWD" "{{url}}" "{{pidfile}}" "{{logfile}}"
    @if [ "${YOLOBOX:-}" = "1" ]; then \
      printf 'note: localhost is inside the yolobox container from this side.\n'; \
    else \
      printf 'note: localhost is on the host from this side.\n'; \
    fi

# Check required command-line tools.
doctor:
    @command -v node
    @node --version
    @command -v npm
    @npm --version
    @command -v jq
    @command -v curl
    @command -v just
    @just --version

# Run the app in the foreground.
run:
    PORT={{port}} npm start

# Alias for `run`.
start:
    @just run

# Start the app in the background on this side of the boundary.
up:
    @mkdir -p "{{state_dir}}"
    @if [ -f "{{pidfile}}" ] && pid="$(cat "{{pidfile}}")" && kill -0 "$pid" 2>/dev/null && ps -p "$pid" -o args= | grep -q 'node server.js'; then \
      printf 'already running on %s as pid %s\n' "{{side}}" "$(cat "{{pidfile}}")"; \
    else \
      rm -f "{{pidfile}}"; \
      if command -v setsid >/dev/null 2>&1; then \
        setsid env PORT={{port}} node server.js </dev/null >"{{logfile}}" 2>&1 & \
      else \
        PORT={{port}} nohup node server.js </dev/null >"{{logfile}}" 2>&1 & \
      fi; \
      printf '%s\n' "$!" >"{{pidfile}}"; \
      sleep 1; \
      if ! curl -fsS "{{url}}" >/dev/null 2>&1; then \
        printf 'server failed to start on %s; log follows:\n' "{{side}}"; \
        sed -n '1,120p' "{{logfile}}" 2>/dev/null || true; \
        rm -f "{{pidfile}}"; \
        exit 1; \
      fi; \
      printf 'started on %s as pid %s\n' "{{side}}" "$(cat "{{pidfile}}")"; \
      printf '%s\n' "{{url}}"; \
    fi

# Stop the background server started on this same side.
down:
    @if [ -f "{{pidfile}}" ] && pid="$(cat "{{pidfile}}")" && kill -0 "$pid" 2>/dev/null && ps -p "$pid" -o args= | grep -q 'node server.js'; then \
      kill "$pid"; \
      rm -f "{{pidfile}}"; \
      printf 'stopped server on %s\n' "{{side}}"; \
    else \
      rm -f "{{pidfile}}"; \
      printf 'no %s server pidfile is running\n' "{{side}}"; \
    fi

# Restart the background server on this side.
restart:
    @just down
    @just up

# Show background server status for this side.
status:
    @if [ -f "{{pidfile}}" ] && pid="$(cat "{{pidfile}}")" && kill -0 "$pid" 2>/dev/null && ps -p "$pid" -o args= | grep -q 'node server.js'; then \
      printf 'running on %s as pid %s\n' "{{side}}" "$(cat "{{pidfile}}")"; \
    else \
      printf 'not running from %s pidfile\n' "{{side}}"; \
    fi
    @curl -fsS "{{url}}" >/dev/null && printf 'http ok: %s\n' "{{url}}" || printf 'http not reachable: %s\n' "{{url}}"

# Print the URL for this side.
url:
    @printf '%s\n' "{{url}}"

# Rebuild the local tournament file from openfootball/worldcup.json.
seed:
    npm run build:seed

# Alias for `seed`.
refresh-source:
    @just seed

# Re-extract the official Annexe C lookup from the FIFA regulations markdown.
annexe:
    npm run extract:annexe-c

# Syntax and data checks that do not require the server.
check:
    node -c server.js
    node -c public/app.js
    node -c scripts/build-openfootball-seed.js
    jq -e '.schemaVersion == 1 and (.groups | length == 12) and (.fixtures | length == 72) and ([.fixtures[].id] | unique | length == 72)' data/world-cup-2026-seed.json >/dev/null
    jq -e 'length == 495' data/annexe-c.json >/dev/null

# Check the running server over HTTP.
smoke:
    @tmp_headers="$(mktemp)"; tmp_body="$(mktemp)"; \
      status="$(curl -sS -L -D "$tmp_headers" -o "$tmp_body" -w '%{http_code}' "{{url}}/")"; \
      grep -q 'World Cup 2026 Explorer' "$tmp_body"; \
      test "$status" = 200; \
      printf 'html ok\n'
    @tmp_body="$(mktemp)"; \
      curl -fsS "{{url}}/data/world-cup-2026-seed.json" -o "$tmp_body"; \
      jq -e '.fixtures | length == 72' "$tmp_body" >/dev/null; \
      printf 'seed json ok\n'
    @tmp_body="$(mktemp)"; \
      curl -fsS "{{url}}/app.js" -o "$tmp_body"; \
      grep -q 'bootFromSources();' "$tmp_body"; \
      printf 'app js ok\n'

# Run static checks, then HTTP smoke checks. Starts a local background server if needed.
verify:
    @just check
    @if ! curl -fsS "{{url}}" >/dev/null 2>&1; then just up; fi
    @just smoke
