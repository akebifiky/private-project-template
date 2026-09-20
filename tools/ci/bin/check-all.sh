#!/usr/bin/env bash
set -euo pipefail

# CI として定義されている機械的に検証可能なチェックをすべて実行するスクリプトです。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${SCRIPT_DIR}/check-coverage.sh"
"${SCRIPT_DIR}/check-docs.sh"
