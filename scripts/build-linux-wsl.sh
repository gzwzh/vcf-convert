#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export USE_SYSTEM_FPM=true

npx electron-builder --config electron-builder.linux.yml --linux AppImage deb