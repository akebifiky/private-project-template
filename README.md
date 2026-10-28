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

# 新規のディレクトリ、または作成済みのリポジトリへ、対話形式で変数を入力して適用する
node dist/cli/cli.js apply ../my-project

# 変数を指定して、対話入力なしで適用する
node dist/cli/cli.js apply ../my-project --no-interactive \
  --vars 'project-name=My Project, git-service=gitlab, ci-mode=actions'

# 適用先を省略するとカレントディレクトリが対象。書き込まずに適用内容だけ確認する
node dist/cli/cli.js apply --dry-run
```

### 既存のファイルがある場合

適用先に同名で内容の異なるファイルがある場合の扱いを、 `--on-conflict` で指定します。内容が同一のファイルは何もしません。

| 値 | 動作 |
| --- | --- |
| `error` (既定) | 衝突したファイルを一覧表示し、何も書き込まずに終了します |
| `skip` | 衝突したファイルは維持し、残りを適用します |
| `overwrite` | 衝突したファイルを上書きします。適用先が Git リポジトリで未コミットの変更がある場合は拒否します |

`--dry-run` を指定すると、作成・同一・衝突などをファイルごとに表示するのみで、何も書き込みません。
`project-name` を指定しない場合は、適用先のディレクトリ名が既定値になります。

### 適用済みのプロジェクトの更新

> [!WARNING]
> 現時点では、テンプレートを適用済みのプロジェクトを、新しいバージョンのテンプレートへ更新することには対応していません。
> 適用時に選択した変数やテンプレートのバージョンを記録しておらず、利用者の変更とテンプレートの変更をマージする機能もないためです。
> 更新に使った場合、 `--on-conflict skip` では新規ファイルのみが取り込まれ、 `overwrite` では利用者の変更が上書きされます。
> `--dry-run` で差分のあるファイルを確認し、必要な変更を手動で取り込んでください。
> 更新への対応は [Issue #22](https://github.com/akebifiky/private-project-template/issues/22) で検討しています。

### テンプレート変数

| 変数 | 内容 | 選択肢・既定値 |
| --- | --- | --- |
| `project-name` | プロジェクト名 | 適用先のディレクトリ名 |
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
