---
status: accepted
date: 2026-10-22
decision_makers: Yoshioka
supersedes: []
superseded_by: []
partially_supersedes: []
partially_superseded_by: []
---

# ADR-0005: スキャフォールディングのテンプレートエンジンに Eta を採用する

- Status: Accepted
- Date: 2026-10-22
- Decision Makers: Yoshioka

## Context

本リポジトリは、管理するテンプレートからプロジェクトをスキャフォールディングする CLI ツールを提供する ([Issue #18](https://github.com/akebifiky/private-project-template/issues/18)) 。
Git サービス (GitHub/GitLab) や CI の実行方式の違いをテンプレート内で出し分けるため、テンプレートファイルは何らかのテンプレートエンジンで処理できる必要がある。

テンプレートの対象となるファイルは Markdown (MDX を含む) ・YAML・JSON・TypeScript・シェルスクリプトなど多岐にわたり、次の記法を多く含む。

- Docusaurus の見出しアンカー (`{#anchor}`) や MDX の式 (`{}`)
- GitHub Actions の式 (`${{ }}`)

そのため、これらの記法と衝突せず、エスケープを要さずに記述できることを重視する。
また、 CLI は TypeScript で実装する ([開発ドキュメント](../project-rules/coding-styles-nodejs.md)) ため、 TypeScript から扱いやすいことも求める。

### 検討した選択肢

以下は一般的な知見に基づく比較であり、採用時点のバージョンでの網羅的な検証は行っていない。

| 選択肢 | 構文 | 評価 |
| --- | --- | --- |
| [Handlebars](https://handlebarsjs.com/) | `{{ }}` | 最も一般的で読みやすい。一方で `${{ }}` や `{}` と衝突し、エスケープが必要になる。条件式のヘルパーも自作が必要になる |
| [EJS](https://ejs.co/) | `<% %>` | 衝突しにくく、任意の JS 式を記述できる。型定義が別パッケージになる |
| [Eta](https://eta.js.org/) | `<% %>` (タグ変更可) | EJS に近い書き心地で衝突しにくい。 TypeScript の型定義が同梱され、 ESM に対応し軽量である。 EJS より利用者は少ない |
| [Nunjucks](https://mozilla.github.io/nunjucks/) / [LiquidJS](https://liquidjs.com/) | `{{ }}` `{% %}` | 機能は豊富だが、 `{{ }}` が衝突し `raw` ブロックが必要になる |
| [Mustache](https://mustache.github.io/) | `{{ }}` | 仕様は最小だが、条件分岐が弱く要件を満たせない |

## Decision

テンプレートエンジンに **Eta** を採用する。

- テンプレートファイルの拡張子は `.eta` とする (例: `README.md.eta`)
- HTML エスケープは行わない
- タグ直後の改行は自動では取り除かず、記述どおりに出力する。制御構文のみの行を出力に残したくない場合は `-%>` で閉じる
- テンプレート内から存在しない変数を参照した場合は、記述ミスを検知できるようエラーとする

## Consequences

- Docusaurus や GitHub Actions の記法をエスケープなしでテンプレートに含められる
- テンプレート内で任意の JavaScript を実行できる。テンプレートは本リポジトリで管理されるものに限る前提とし、外部から取得したテンプレートを扱う場合はあらためて検討する
- Eta は EJS と比べて利用者が少ないため、情報が不足する場合は公式ドキュメントを参照する
