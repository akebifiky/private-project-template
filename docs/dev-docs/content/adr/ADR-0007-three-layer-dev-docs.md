---
status: accepted
date: 2026-10-31
decision_makers: Yoshioka
supersedes: []
superseded_by: []
partially_supersedes: [ADR-0002-build-dev-docs-using-docusaurus#管理構造]
partially_superseded_by: []
---

# ADR-0007: 開発ドキュメントを「ビジネス要求・システム要件・システムデザイン」の 3 層で構成する

- Status: Accepted
- Date: 2026-10-31
- Decision Makers: Yoshioka

## Context

開発ドキュメントは [ADR-0002](./ADR-0002-build-dev-docs-using-docusaurus.md) において、「要求仕様 (`requirements/`) 」と「システムデザイン (`system-design/`) 」の 2 構成で管理することを定めていた。
この構成では、要求仕様で「なぜ (Why) 」を、システムデザインで「何を (What) 」「どのように (How) 」を記述する想定であった。

一方で、要求仕様の実際の記述は EARS (Easy Approach to Requirements Syntax) 記法によるシステムのふるまい (What) となりやすい。
すなわち、 Why → What → How と段階的に落とし込むうえで、 **What を担う層が存在せず、要求仕様が What を肩代わりしている** 状態にあった。

この構造的なずれは、次の課題の根本原因となる。

- 「なぜこの機能が必要か」という基本的な要求 (Why) の置き場がなく、明文化されない
- ドメインの分割基準が How (データソース・コンポーネント) に引きずられる

### 検討した選択肢

| 選択肢 | 概要 | 評価 |
| --- | --- | --- |
| 現状維持 (2 構成) | 要求仕様に Why と What を混在させる | Why の置き場がない課題が解消されない |
| 要求仕様 (`requirements`) + 仕様 (`specifications`) の 2 層に分ける | 要求仕様に Why、仕様に What を記述する | 「仕様」は How を含みうる語であり、 What と How の区別が弱まる。また「要求仕様」の語も What / How を連想させる |
| ステークホルダー要求・ビジネス要求・システム要件・システムデザインの 4 層に分ける | ISO/IEC/IEEE 29148 に沿って要求を細分化する | ほとんどのプロジェクトの規模では細分化の利点が小さく、運用負荷が上回る |
| ビジネス要求・システム要件・システムデザインの 3 層に分ける | Why / What / How を、それぞれ独立した層として定義する | 採用 |

## Decision

開発ドキュメントを、次の 3 層で構成する。

| 層 | 日本語 | 英語 (ディレクトリ名) | 書式 |
| --- | --- | --- | --- |
| Why | ビジネス要求 | Business Requirements (`business-requirements`) | ユーザーストーリー |
| What | システム要件 | System Requirements (`system-requirements`) | EARS |
| How | システムデザイン | System Design (`system-design`) | 設計書 |

層間は、ビジネス要求 → システム要件 → システムデザインの順に落とし込む。

### 用語

- 日本語の「要求」と「要件」は、 Why と What を示す別の概念として区別する。英語では修飾語 (Business / System) で区別する
- 「要求仕様」は、「仕様」が What / How を連想させ層の区別を弱めるため、名称として用いない。 Why を示す層は「ビジネス要求」に一本化する
- 英語で `requirements` と `specifications` を区分する構成は、 specification が How も含みうるため採用しない

### ISO/IEC/IEEE 29148 との対応

ISO/IEC/IEEE 29148 では、ステークホルダー要求、ビジネス要求、システム要件が別の層として定義されている。
本テンプレートでは、ほとんどのプロジェクトの規模で細分化の利点が小さいため、ステークホルダーの必要性をビジネス要求に内包する。

| 本テンプレート | ISO/IEC/IEEE 29148 |
| --- | --- |
| ビジネス要求 | ビジネス要求 (Business Requirements) 、ステークホルダー要求 (Stakeholder Requirements) |
| システム要件 | システム要件 (System Requirements) |
| システムデザイン | (規格の対象外。設計に該当する) |

### ID 体系

- ビジネス要求の ID は `BR-<業務領域略称>-XXX` 、システム要件の ID は `SR-<ドメイン略称>-XXX` とする (3 桁ゼロ埋め)
- 従来の要求仕様の ID (`REQ-`) は用いない。既存のプロジェクトで `REQ-` を用いている場合は、システム要件の ID (`SR-`) へ接頭辞のみを置き換えて移行する (ドメイン略称と連番は変更しない)
- 削除した ID は欠番として扱い、再利用しない

## Consequences

- Why・What・How の各層の責務が明確になり、基本的な要求 (Why) を記述する場所ができる
- 「要求仕様」「システム要求」の表記は、「ビジネス要求」「システム要件」へ置き換わる
- ADR-0002 に記載された管理構造 (`requirements/`) は本 ADR により変更される。 ADR-0002 は決定時点の記録として、リンクが切れない範囲でのみ更新する
- 層が増えることで、層間のトレーサビリティ (ビジネス要求 → システム要件 → システムデザイン) を維持する運用負荷が生じる
- ドメインの分割基準は、 How (データソース・コンポーネント) ではなく、「同一の Why を満たす手段は 1 つの業務領域にまとめる」ことを基準とする
- 本ツールでテンプレートを適用済みのプロジェクトは、本構成への自動更新の対象外である。必要に応じて手作業で移行する

## References

- [ADR-0002: 開発ドキュメントを Docusaurus を用いて構築する](./ADR-0002-build-dev-docs-using-docusaurus.md)
- ISO/IEC/IEEE 29148 (要求工学の国際規格)
- [EARS (Easy Approach to Requirements Syntax)](https://alistairmavin.com/ears/)
