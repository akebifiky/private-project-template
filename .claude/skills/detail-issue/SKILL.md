---
name: detail-issue
description: >-
  TRIGGER — ユーザーが特定の GitHub Issue に対して「詳細化して」「詳細化を進めて」のように明示的に詳細化を依頼したとき、または
  `/detail-issue <Issue番号>` のようにコマンドを名指しで呼び出したときのみ使う。draft ラベル付き Issue の内容をユーザーと議論しながら
  詳細化し、関連する開発ドキュメントを更新のうえ受け入れ条件を明確化する一連の手続きを行う。
  SKIP — 単に Issue の内容を尋ねられた・要約してほしいと言われた・Issue 番号や URL に言及されただけ、あるいは Issue に紐づく
  実装作業やドキュメント調査そのものを依頼された場合は、明示的な詳細化依頼ではないため絶対に使わない。判断に迷う場合は使わずに
  通常の会話として対応する。
---

# Issue 詳細化コマンド

GitHub Issue の参照・更新には `gh` コマンドを使用すること。対象リポジトリはカレントディレクトリの Git リモートから判定される。

## 入力

`$ARGUMENTS` から対象の Issue 番号を取得する。`#123` 、`123` のいずれの表記も許容する。番号が取得できない場合はユーザーに確認する。

## 手続き

### 1. Issue の取得

```bash
gh issue view <番号>
```

本文・ラベル・マイルストーンを取得する。

### 2. draft ラベルの確認

`draft` ラベルが付与されていない場合、詳細化を継続するかどうかを AskUserQuestion でユーザーに確認する。中断が選ばれた場合はここで終了する。

ラベルの定義・付与基準は [Issue ラベル運用規約](../../../docs/dev-docs/content/project-rules/issue-labels.md) を参照。

### 3. 関連ドキュメントの調査

Issue 本文から実現したいことの概要・関連するドメイン/コンポーネントを読み取り、関連する範囲の開発ドキュメントを確認する。

- ADR: `docs/dev-docs/content/adr/` ([index.mdx](../../../docs/dev-docs/content/adr/index.mdx) の運用ルールも参照)
- ビジネス要求: `docs/dev-docs/content/business-requirements/` ([index.md](../../../docs/dev-docs/content/business-requirements/index.md) の運用ルールも参照)
- システム要件: `docs/dev-docs/content/system-requirements/` ([index.md](../../../docs/dev-docs/content/system-requirements/index.md) の運用ルールも参照)
- システムデザイン: `docs/dev-docs/content/system-design/`
- コーディング規約: [coding-styles.md](../../../docs/dev-docs/content/project-rules/coding-styles.md)

全ドキュメントを機械的に読み込むのではなく、Issue の内容に関連する範囲に絞り込んで確認すること。関連範囲の特定や横断的な調査が必要な場合は、Explore サブエージェントへの委任も検討する。

### 4. 不明瞭点の洗い出し・ユーザーとの議論

関連ドキュメントを踏まえ、Issue の内容における不明瞭な点・決定すべき論点 (代替案がある事項、既存ドキュメントとの矛盾、未決定事項など) を洗い出す。

洗い出した論点は AskUserQuestion などを用いてユーザーに提示し、対話的に議論・決定する。決定事項は都度要約してユーザーに確認を取ること。大きな設計判断を伴う場合は EnterPlanMode を用いてもよい。

### 5. 開発ドキュメントの更新

議論の結果、ADR 新設やビジネス要求・システム要件・システムデザインの更新が必要と判断した場合、このコマンドの範囲内でファイル作成・編集まで行う。

- ADR: [ADR 運用ルール](../../../docs/dev-docs/content/adr/index.mdx) (連番・ファイル名・ステータス等) に従う
- ビジネス要求・システム要件: 各 `index.md` の運用ルールに従う
- 全ドキュメント共通で [共通フォーマット](../../../docs/dev-docs/content/project-rules/common-format.md) (全角記号禁止、和英混在時のスペース等) を遵守する

### 6. 受け入れ条件の明確化

Issue の実装内容に応じ、実装後に満たすべき条件を受け入れ条件として具体化する。コーディング規約への準拠、テストの観点、ローカルでの検証コマンドの成功 (`./tools/ci/bin/check-all.sh`) などを必要に応じて含める。

ドキュメントのみの変更などコード実装を伴わない Issue の場合は、コードに関する条件を適用除外する旨と、その判断根拠を受け入れ条件に明記する。

### 7. ローカル CI によるドキュメントフォーマットの検証

手順5で `docs/dev-docs/content/` 配下のファイルを変更した場合、コミット・PR 作成に進む前に、必ず以下を実行してフォーマット違反がないことを確認する。

```bash
./tools/ci/bin/check-docs.sh
```

終了コードが非 0 (FAIL) の場合、エラー内容に基づいて手順5で変更したファイルを修正し、成功するまで本手順を繰り返す。原因の特定が難しい失敗が続く場合は、AskUserQuestion でユーザーに相談する。

手順5でドキュメントの変更が生じなかった場合は、この手順をスキップしてよい。

### 8. Git 操作

`git status` で作業ツリーの状態を確認したうえで、[CONTRIBUTING.md](../../../CONTRIBUTING.md) のブランチ戦略に従い、`develop` から `topic/issue-<番号>` の形式でトピックブランチを作成する。並行作業が想定される場合は CLAUDE.md の方針に従い `.claude/worktrees/` 配下に Git Worktree を作成して分離する。

ドキュメント変更を、[CONTRIBUTING.md](../../../CONTRIBUTING.md) のコミットメッセージ規約 (絵文字プレフィックス `:memo:` 、先頭に Issue 番号) に従いコミットする。

### 9. PR の作成

```bash
gh pr create --base develop --title "..." --body "..."
```

`develop` ブランチ向けの通常 (非 Draft) PR を作成する。本文には [開発作業フロー](../../../docs/dev-docs/content/project-rules/workflow.md) の必須記載項目 (目的・変更内容・影響範囲・テスト観点・関連 Issue) を含める。

この手順で作成する PR はドキュメント更新のみを行い、対象 Issue そのものを解決するものではないため、関連 Issue は `Closes #<番号>` ではなく `Refs #<番号>` と記載する。

### 10. Issue 本文の更新・ラベル除去

議論により確定した概要・決定事項・受け入れ条件を Issue 本文に反映し、`draft` ラベルを除去する。この更新は手順9の PR 作成後、 PR のマージを待たずに実施する。

```bash
gh issue edit <番号> --body-file <本文ファイル> --remove-label draft
```

### 11. 完了報告

作成したトピックブランチ・PR の URL・更新した開発ドキュメントの一覧をユーザーに要約して報告する。

## 実行範囲に関する補足

手順4 (議論) が確定した後、手順5〜10 (ドキュメント更新・受け入れ条件の明確化・ローカル CI によるドキュメントフォーマットの検証・Git 操作・PR 作成・Issue 更新・ラベル除去) は、追加の確認を挟まず連続して自動実行すること。CLAUDE.md の「大規模な変更 (200行以上) を行う場合には、その前にまず変更計画を提案する」というルールは、本コマンドの実行範囲においては適用しない。
