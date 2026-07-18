---
sidebar_position: 4
---

# Python コーディングルール

以下は、 [コーディング規約](./coding-styles) のうち、 Python (`pipelines/`, `services/` 配下) に適用する追加ルールです。  
特に指定のない部分は **PEP 8** および本規約に従うものとします。

## 基本方針

- Python の最小サポートバージョンは **3.13** とする
  - AWS Lambda の Python ランタイムのうち、本ページ作成時点で最もサポート期間が長い (2029-06 まで) バージョンであるため ([AWS Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html) 参照)
- フォーマッタ・リンターには **Ruff** を使用する
  - Lint、フォーマットの両方を Ruff で行い、実行は `uv run ruff check` / `uv run ruff format` を基本とする
- すべての関数・メソッドは、引数・戻り値に **型ヒント** を必須とする

## インデント・行の長さ

- インデントは **スペース 4 つ** とする (タブは禁止)
- 1行あたりの最大文字数は **88文字** とする (Ruff/Black 互換のフォーマット既定値)

## 命名

- 変数・関数・メソッド・モジュール名は **`snake_case`** で命名する
- クラス名は **`PascalCase`** で命名する
- 定数は [コーディング規約](./coding-styles) の共通ルール通り `SCREAMING_CASE` で命名する
- アクロニム (`url`, `id`, `html` など) は Python の一般的な慣習に従い、他の単語と同様に小文字で扱う
  - 例: `endpoint_url`, `item_id`, `parse_html`

## Docstring

- すべてのクラス・関数・メソッドには **Google Style** の Docstring を付す
- `Args:` / `Returns:` / `Raises:` を、該当する場合は明確に記述する
- Docstring 本文は日本語で記述し、 [コーディング規約](./coding-styles) の「コメントの記述スタイル」(応答します調) に従う

```python
class Article:
    """記事を示すモデル。"""

    def __init__(self, name: str) -> None:
        """名称を指定したインスタンスを生成して応答します。

        Args:
            name: 記事の名称。
        """
        ...

    def name(self) -> str:
        """この記事の名称を応答します。

        Returns:
            名称。
        """
        ...

    def copy_with(self, article: "Article") -> "Article":
        """この記事に対し、指定の記事が持つ内容・属性をマージしたコピーを応答します。

        この操作では、この記事の内容・属性は変更されません。

        Args:
            article: マージ対象の記事。

        Returns:
            マージされた記事。
        """
        ...
```

## 例外管理

- すべての例外は **`app_core.exceptions.AppError`** を継承するものとする
  - `AppError` は `pipelines/`, `services/` を横断して共有される基底クラスであるため、下記「プラグイン・パッケージ間で共有される概念」で触れる共有パッケージ `commons/app-core/` に配置する
- システム全体でのエラーハンドリングは、 `AppError` を基底とする例外体系を通じて統一的に行う

### 例外クラスの実装例

```python
from app_core.exceptions import AppError


class ArticleNotFoundError(AppError):
    """記事が見つからない場合の例外。"""


# 使用例
raise ArticleNotFoundError("記事の取得において、指定された記事が見つかりませんでした")

# 元の例外を保持したい場合は、 Python 標準の例外連鎖構文を用いる
raise ArticleNotFoundError("記事の取得において、指定された記事が見つかりませんでした") from original_error
```

- 例外の種別は **例外クラスの型で判別する** (固定のエラーコードは設けない)
- 元の例外を保持する場合は、独自の `cause` 引数などを設けず、 Python 標準の `raise ... from ...` 構文を用いる

## パッケージ構造

本プロジェクトにおいて、ディレクトリ構造・パッケージ構造は単なるファイル整理のための手段ではなく、 **コードがどのような概念として存在しているか** を宣言するものとして扱われます。

### 標準ディレクトリ構造

Python 側のプログラムは、対象ディレクトリ (`pipelines/` または `services/`) 配下を **プラグイン単位** で分割して管理します。

各プラグインは、さらにプラグインに含まれる機能単位に分割して `features/` 配下で管理されるものとします。

```text
<pipelines または services>/
  <plugin>/
    features/
      <feature>/
        ...
```

### 機能パッケージの基本構造

`features/` 配下では、機能ごとに以下のディレクトリ構造を用いることができます。

```text
features/
  <feature>/
    application/
      handlers/
      use_cases/
    domain/
      models/
    infrastructure/
      repositories/
      query_services/
    exceptions/
```

これらは本プロジェクトにおける一次概念であり、存在する場合は以下の意味を持つものとして扱われます。

- `application/`
  - Lambda からの呼び出しを受け付け、ビジネスロジックを実装する責務を持つコードを管理します
  - `use_cases/`
    - 各ハンドラーに対応する具体的なビジネスロジックを管理します
    - ビジネスロジックの中心となる処理を実装し、必要に応じて `domain/` や `infrastructure/` のコードを利用できます
- `domain/`
  - その機能において中心となる概念を表すコードを管理します
  - 他の機能をまたいでプラグイン内で共有される概念は、機能より上の階層、すなわちプラグイン直下の `domain/` に配置されることを想定しています
  - `models/`
    - その機能において中心となる概念を表すモデル (ドメインモデル) を管理します
    - 永続化に関する技術的詳細は、 `infrastructure/` に配置されるコードが担うものとします
- `infrastructure/`
  - 永続化や外部 I/O など、技術的詳細を含むコードを管理します
  - `repositories/`
    - ドメインモデルの永続化を担うリポジトリに相当するコードを管理します
    - クラス名は `*Repository` (例: `ArticleRepository`) とすることを想定しています (参考)
  - `query_services/`
    - 永続化されたドメインモデルを検索・参照するためのクエリサービスに相当するコードを管理します
    - クラス名は `*QueryService` (例: `ArticleQueryService`) とすることを想定しています (参考)
- `exceptions/`
  - その機能に関連する例外に相当するコードを管理します

これらのディレクトリは **すべての機能パッケージに必須ではありません**。ただし、存在する場合は上記の責務を持つものとして扱われます。

なお、同じプラグイン内の複数の機能にまたがって共有される概念・モデルが存在する場合、それらは機能パッケージの階層より上の階層、すなわちプラグイン直下に配置されることが想定されます。

:::note
ディレクトリ命名原則・レビュー時の判断指針は、 [コーディング規約](./coding-styles) 全体で共有される考え方 (概念の宣言であること、責務を一文で説明できること等) に従います。
:::

### プラグイン・パッケージ間で共有される概念

`pipelines/` や `services/` を横断して共有される概念 (共通の型・例外・ユーティリティなど) は、 **uv の workspace 機能** を用いて、 `commons/` という新たなトップレベルディレクトリに切り出して管理します。

```text
commons/
  app-core/
    pyproject.toml
    src/
      app_core/
        ...
pipelines/
  <plugin>/
    pyproject.toml
services/
  <plugin>/
    pyproject.toml
pyproject.toml   # workspace 定義 ([tool.uv.workspace])
```

- 共有したい概念は `commons/<package-name>/` として独立した Python パッケージに切り出す
- 各実装パッケージ (`pipelines/`, `services/` 配下) 側の依存関係に、 `{ workspace = true }` の形で参照を追加する
- workspace のメンバー構成は、リポジトリ直下の `pyproject.toml` の `[tool.uv.workspace]` で管理する

:::note
uv workspace はローカルでの依存関係解決・開発時の仕組みであり、 Lambda の実行時の動作には影響しません。ただし Lambda のデプロイパッケージ (zip / レイヤー等) に `commons/` 配下のパッケージをどう含めるかは別途の検討が必要であり、具体的なビルド・デプロイ方式はインフラ構築・デプロイ方式の検討と合わせて決定します。
:::
