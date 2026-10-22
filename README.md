# Private Project Template

個人的なプロジェクトにおいてよくある構成 (主にドキュメンテーションの構成と、 AI との協業を想定した構成) を、テンプレートから生成するための CLI ツールです。
なお、プロジェクトは日本語を前提としている点に注意してください。

## 概要

- `templates/` 配下で管理するテンプレートから、新しいプロジェクトの雛形を生成します
- 生成時に、利用する Git サービス (GitHub / GitLab) や CI の実行方式 (ローカル / Actions) を選択できます
- テンプレートファイルは [Eta](https://eta.js.org/) で記述でき、選択に応じて内容やファイルの出力有無を切り替えられます

## 使い方

Node.js 22 以上が必要です。

```bash
npm ci
npm run build

# 対話形式で変数を入力する
node dist/cli/cli.js create ../my-project

# 変数を指定して、対話入力なしで生成する
node dist/cli/cli.js create ../my-project --no-interactive \
  --vars 'project-name=My Project, git-service=gitlab, ci-mode=actions'
```

出力先は、存在しない、または空のディレクトリである必要があります。

### テンプレート変数

| 変数 | 内容 | 選択肢・既定値 |
| --- | --- | --- |
| `project-name` | プロジェクト名 | 必須 |
| `git-service` | 利用する Git サービス | `github` (既定) / `gitlab` |
| `ci-mode` | CI の実行方式。 `actions` の場合のみ `main` 向け PR/MR で CI ツールを実行する定義を出力します | `local` (既定) / `actions` |

## ディレクトリ構造

- `src/` ... CLI ツールのソースコード
- `tests/` ... CLI ツールのテスト
- `templates/` ... スキャフォールディングに使うテンプレートデータ
  - `default/` ... 既定のテンプレート。 `scaffold.manifest.json` に変数と出し分けの規則を宣言します
- `docs/dev-docs/` ... 本リポジトリの開発ドキュメント
- `tools/ci/` ... 本リポジトリの CI として実行する検証スクリプト

## テンプレートの書き方

- `*.eta` はテンプレートとして描画し、拡張子を除いた名前で出力します。それ以外のファイルはそのままコピーします
- テンプレートからは、変数 (`it.projectName` など) と派生変数 (`it.git.cli` ・ `it.git.reviewUnit` など) を参照できます。存在しない変数を参照するとエラーになります
- ファイル単位の出し分けは、マニフェストの `files` に、パス (glob) と出力条件を宣言します
- 詳細な方針は [ADR-0005](docs/dev-docs/content/adr/ADR-0005-adopt-eta-as-template-engine.md) と [ADR-0006](docs/dev-docs/content/adr/ADR-0006-scaffold-template-structure.md) を参照してください

## 開発

```bash
./tools/ci/bin/check-all.sh   # すべての検証 (ツールの Lint・型検査・テスト、開発ドキュメントの検証)
npm test                      # テストのみ
```
