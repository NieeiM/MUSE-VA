#!/usr/bin/env sh
set -eu

PORT="${1:-8000}"

cd "$(dirname "$0")"

echo "Serving MUSE-VA at http://localhost:${PORT}/"
echo "Press Ctrl+C to stop."

python3 -m http.server "$PORT"
