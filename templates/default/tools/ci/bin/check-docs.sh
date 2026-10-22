#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
DOCS_DIR="${REPO_ROOT}/docs/dev-docs"
cd "${DOCS_DIR}"

# 開発ドキュメント (docs/dev-docs) に含まれるコンテンツが正しくビルド可能で、フォーマットに違反していないことを検証するためのスクリプト。
# 各種ビルド・検証が失敗した場合、このスクリプトは失敗する (exit code 1) ことを想定します。

echo "==> docs/dev-docs/ の依存パッケージをインストールしています"
npm ci

echo "==> Biome (Lint / フォーマットチェック) を実行しています"
npm run lint

echo "==> TypeScript の型チェックを実行しています (Docusaurus 本体・src/)"
npm run typecheck

echo "==> ADR/TC の Frontmatter を検証しています (番号重複・status: open な TC の trigger_summary 欠落)"
npm run lint:adr-tc

echo "==> 共通フォーマットの括弧スペース違反を検証しています (括弧の内側にスペースを設けない規則7)"
npm run lint:common-format

echo "==> Docusaurus のビルドを実行しています (ADR/TC 一覧の動的生成を含む)"
npm run build
