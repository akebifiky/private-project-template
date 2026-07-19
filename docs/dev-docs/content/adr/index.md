---
sidebar_position: 1
---

# ADR について

## 目的

ADR (Architecture Decision Record) は、重要な設計判断を時系列で記録し、判断の根拠と影響範囲を追跡可能にするためのドキュメントです。
本プロジェクトでは、原則として次の依存関係で成果物を構築することを想定しています。

`ADR -> ドキュメント -> 実装`

## 記録基準

ADR として記録するかどうかを都度判断すると、チーム開発においては記録の粒度がぶれやすい。
以下の基準を目安として、記録の要否を判断する。

### 記録すべき事項

次のいずれかに該当する場合は、 ADR としての記録を検討する。

- **影響範囲**: 単一ファイル・単一関数の変更に閉じず、複数のコンポーネントや複数の開発者の作業に影響する
- **可逆性の低さ**: 後から覆す場合に、データ移行や API 互換性の破壊、大規模な書き換えなど大きな手戻りを伴う
- **代替案の比較を伴う**: 複数の選択肢を検討したうえで、それらを退けて一つを採用した (選択の余地がなかった事項は対象外)
- **将来の意思決定への制約**: 今後の実装・設計判断の前提や制約になる
- **認識のブレやすさ**: チームメンバー間で暗黙の前提が食い違いやすく、明文化しないと将来誤った変更を招くおそれがある

### 記録不要な事項

次に該当する事項は、原則として ADR 化の対象外とする。

- コードを読めば自明な実装の詳細 (変数名、内部関数の分割など)
- 設計判断を伴わない単純なバグ修正
- 頻繁に変わりうるチューニング値・設定値
- 特定 Issue に閉じた一時的な作業メモ (Issue 上のコメントで足りる)

## 運用ルール

- 1 つの意思決定につき 1 ファイルを作成する
- ファイル名は `ADR-XXXX-<kebab-case-title>.md` の形式とする (例: `ADR-0001-record-decision.md`)
- 連番は 4 桁のゼロ埋めとし、既存の最大番号の次の番号を使用する
- ステータスは、後述のステータス一覧で定義されているステータスのいずれかを明記する
- 既存決定を置き換える場合は、新 ADR の Frontmatter `supersedes` と Status 行に旧 ADR を記載し、旧 ADR 側の Frontmatter `superseded_by` と Status 行に新 ADR を記載する
- 実装やシステムデザイン文書は、該当 ADR を参照する
- 参照すべき PR/Issue はリンク形式で記載する。ただし、本文 (Context・Consequences など) 中では Issue 番号のみをプレーンテキストで言及するに留め、リンクは `References` セクションにのみ記載する

## ステータス一覧

- `Proposed` (Frontmatter 上は `proposed`): 提案中。まだ正式採用されていない
- `Accepted` (Frontmatter 上は `accepted`): 採用済み。現行の正規方針
- `Superseded` (Frontmatter 上は `superseded`): 後続 ADR により置き換え済み
- `Deprecated` (Frontmatter 上は `deprecated`): 廃止済み。新規には適用しない
- `Rejected` (Frontmatter 上は `rejected`): 検討したが採用しないと決定した

## 書式 (テンプレート)

```markdown
---
status: accepted
date: YYYY-MM-DD
decision_makers: ...
supersedes: []
superseded_by: []
---

# ADR-XXXX: タイトル

- Status: Accepted
- Date: YYYY-MM-DD
- Decision Makers: ...

## Context

背景、課題、制約

## Decision

採用する判断内容

## Consequences

期待効果、トレードオフ、運用影響

## References

関連ドキュメント、Issue/PR など
```

既存 ADR を置き換える場合、新 ADR 側は Frontmatter `supersedes` に置き換える旧 ADR のファイル名を配列で記載し、Status 行にも `(Supersedes ADR-XXXX) ` を付記する。旧 ADR 側は `status` を `superseded` としたうえで、Frontmatter `superseded_by` に新 ADR のファイル名を配列で記載し、Status 行にも `(Superseded by ADR-XXXX) ` を付記する。いずれも対象が複数件ある場合はカンマ区切りで列挙する。

## Index

- [ADR-0001: システム仕様に関わる意志決定を ADR として記録する](ADR-0001-record-decisions-as-adr.md)
- [ADR-0002: 開発ドキュメントを Docusaurus を用いて構築する](ADR-0002-build-dev-docs-using-docusaurus.md)
- [ADR-0003: 技術的懸念 (TC) を独立したドキュメント種別として管理する](ADR-0003-technical-concern-management.md)
