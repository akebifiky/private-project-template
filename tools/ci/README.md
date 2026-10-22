# CI ツール

本ディレクトリは、本リポジトリのビルド・テスト・Lint・カバレッジ計測を行う CI ツール一式を管理します。

## 位置づけ

- `develop` 向け PR: [開発作業フロー](../../docs/dev-docs/content/project-rules/workflow.md) に従い、開発者 (または AI エージェント) がローカル環境で `tools/ci/bin/check-all.sh` を実行して検証します。GitHub Actions は起動しません。
- `main` 向け PR (バージョン確定時のリリース PR): GitHub Actions として定義・実行されます。

なお、将来的に全ての CI ゲートを GitHub Actions として定義・実行する想定になったとしても、
本ツールにて定義するスクリプトに処理が集約されることを想定し、定義上は本ツールを呼び出すことを想定します。

## 使い方

リポジトリルートから、次のコマンドを実行します。

```bash
./tools/ci/bin/check-all.sh
```

## ファイル構成

- `bin/check-all.sh`: すべての検証を実行するためのスクリプト
- `bin/check-tool.sh`: スキャフォールディング CLI ツールの Lint・型検査・ビルド・テストを実行するスクリプト
- `bin/check-coverage.sh`: カバレッジを算出し、基準値と比較するスクリプト
- `bin/check-docs.sh`: 開発ドキュメントに含まれるコンテンツのフォーマットを検証するスクリプト
