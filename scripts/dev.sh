#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

backend_pid=""
frontend_pid=""

cleanup() {
  if [[ -n "${backend_pid}" ]]; then
    kill "${backend_pid}" 2>/dev/null || true
  fi
  if [[ -n "${frontend_pid}" ]]; then
    kill "${frontend_pid}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

cd "${root_dir}/backend"
(npm run start:dev) &
backend_pid=$!

echo "Backend running (pid ${backend_pid})."

cd "${root_dir}/frontend"
(npm run dev) &
frontend_pid=$!

echo "Frontend running (pid ${frontend_pid})."

echo "Press Ctrl+C to stop both."

wait
