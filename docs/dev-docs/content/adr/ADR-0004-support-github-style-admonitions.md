---
status: accepted
date: 2026-09-26
decision_makers: Yoshioka
supersedes: []
superseded_by: []
---

# ADR-0004: 開発ドキュメントで GitHub スタイルの Admonition をサポートする

- Status: Accepted
- Date: 2026-09-26
- Decision Makers: Yoshioka

## Context

開発ドキュメントの基盤である Docusaurus ([ADR-0002](./ADR-0002-build-dev-docs-using-docusaurus.md)) では、注記や警告などの Admonition を `:::note` のようなディレクティブ構文で記載する必要がある ([Docusaurus 公式ドキュメント](https://docusaurus.io/docs/markdown-features/admonitions)) 。
一方で、 GitHub をはじめとする一部のマークダウンレンダラーは、引用ブロックを用いた `> [!NOTE]` のような構文 (以下、 GitHub スタイル) で Admonition を記載する。

各ドキュメントは Docusaurus を起動せずに GitHub/GitLab などの Git サービス上で直接確認されるシーンも多いが、ディレクティブ構文はこれらのサービス上では Admonition として表示されない。
そのため、 Git サービス上と Docusaurus 上のいずれでも Admonition として表示できる GitHub スタイルの記法を、 Docusaurus 上でもサポートしたい ([Issue #15](https://github.com/akebifiky/private-project-template/issues/15)) 。

なお、 Docusaurus 3.10.2 時点では GitHub スタイルの記法は標準でサポートされていない ([Feature Request](https://docusaurus.io/feature-requests/p/support-blockquote-style-admonitions)) 。

### 検討した選択肢

| 選択肢 | 概要 | 評価 |
| --- | --- | --- |
| [remark-github-admonitions-to-directives](https://github.com/incentro-ecx/remark-github-admonitions-to-directives) | GitHub スタイルの記法を Docusaurus のディレクティブ構文へ変換する remark プラグイン | Docusaurus 標準の Admonition コンポーネントで表示されるため、見た目やテーマの一貫性が保たれる |
| [remark-github-blockquote-alert](https://github.com/jaywcjlove/remark-github-blockquote-alert) / [remark-github-alerts](https://github.com/hyoban/remark-github-alerts) | GitHub スタイルの記法を独自の HTML に変換する remark プラグイン | 独自のスタイル定義が必要となり、既存のディレクティブ構文による Admonition と見た目が揃わない |
| [rehype-github-alerts](https://github.com/chrisweb/rehype-github-alerts) | GitHub スタイルの記法を GitHub 風の HTML に変換する rehype プラグイン | 同上 |
| 独自の remark プラグインを実装する | 変換処理を自前で実装する | 既存のパッケージで要件を満たせるため、保守コストに見合わない |

## Decision

[remark-github-admonitions-to-directives](https://github.com/incentro-ecx/remark-github-admonitions-to-directives) を導入し、 GitHub スタイルの記法を Docusaurus のディレクティブ構文へ変換したうえで、 Docusaurus 標準の Admonition として表示する。

- Docusaurus 標準の Admonition 処理より前に変換する必要があるため、プラグインは `@docusaurus/plugin-content-docs` の `beforeDefaultRemarkPlugins` に指定する
- 各種別の対応はパッケージの既定の対応に従う
  - Docusaurus には `important`/`caution` に相当する種別が存在しないため、それぞれ最も意味の近い `info`/`danger` として表示する

| GitHub スタイル | Docusaurus |
| --- | --- |
| `[!NOTE]` | `note` |
| `[!TIP]` | `tip` |
| `[!IMPORTANT]` | `info` |
| `[!WARNING]` | `warning` |
| `[!CAUTION]` | `danger` |

- 開発ドキュメント内で Admonition を記載する場合は、原則として GitHub スタイルの記法を用いる ([共通フォーマット](../project-rules/common-format.md) を参照)

## Consequences

- 開発ドキュメント内の Admonition を、 Git サービス上と Docusaurus 上のいずれでも Admonition として確認できるようになる
- 表示には Docusaurus 標準の Admonition コンポーネントが用いられるため、既存のディレクティブ構文と見た目が揃い、独自のスタイル定義は不要となる
- `[!IMPORTANT]`/`[!CAUTION]` は、 Git サービス上と Docusaurus 上とで表示される種別名・色が異なる
- GitHub スタイルの記法ではタイトルを指定できないため、タイトルを指定したい場合はディレクティブ構文 (例: `:::note[タイトル]`) を用いる必要がある
- 導入したパッケージは 2024-10 以降更新されていないため、 Docusaurus のアップデートに伴い動作しなくなる可能性がある
  - 変換処理自体は小規模であるため、その場合は独自の remark プラグインへの置き換えを検討する
