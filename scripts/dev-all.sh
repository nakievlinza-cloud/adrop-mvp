#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

cleanup() {
  trap - EXIT INT TERM
  kill 0 >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

npm run dev:client &
npm run dev:server &

wait
