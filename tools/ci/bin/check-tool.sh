#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
cd "${REPO_ROOT}"

# スキャフォールディング CLI ツール (リポジトリルート) の Lint・型検査・ビルド・テストを実行するためのスクリプト。
# テストにはテンプレートからの生成結果の検査 (スナップショットテストを含む) が含まれる。
# 各検証が失敗した場合、このスクリプトは失敗する (exit code 1) ことを想定します。

echo "==> ルートの依存パッケージをインストールしています"
npm ci

echo "==> Biome (Lint / フォーマットチェック) を実行しています"
npm run lint

echo "==> TypeScript の型チェックを実行しています"
npm run typecheck

echo "==> ビルドを実行しています"
npm run build

echo "==> テストを実行しています (テンプレートの生成結果の検査を含む)"
npm test
