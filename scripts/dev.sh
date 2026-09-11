#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Authenticate before starting background processes so sudo can prompt normally.
sudo -v

caddy_pid=""
vite_pid=""

cleanup() {
    trap - EXIT INT TERM
    if [[ -n "$vite_pid" ]]; then
        kill "$vite_pid" 2>/dev/null || true
    fi
    if [[ -n "$caddy_pid" ]]; then
        sudo -n kill -TERM "$caddy_pid" 2>/dev/null || true
    fi
    wait || true
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

sudo caddy run --config "$PWD/Caddyfile" &
caddy_pid=$!

./node_modules/.bin/vite "$@" &
vite_pid=$!

# Stop the other process if either server exits.
wait -n "$caddy_pid" "$vite_pid"
