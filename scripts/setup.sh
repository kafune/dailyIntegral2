#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${root_dir}/backend"
npm install

cd "${root_dir}/frontend"
npm install

echo "Setup complete."
