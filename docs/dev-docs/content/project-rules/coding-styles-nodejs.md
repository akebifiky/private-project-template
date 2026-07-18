---
sidebar_position: 5
---

# Node.js/TypeScript コーディングルール

以下は、 [コーディング規約](./coding-styles) のうち、 Node.js/TypeScript (`apps/` 配下) に適用する追加ルールです。

:::note
`apps/` (検索 UI) で使用するフロントエンドフレームワークは、本ページ作成時点では未定です (関連: GitLab Issue #1) 。フレームワーク選定後、必要に応じてディレクトリ構造など本ページの内容を追記・更新します。
:::

## 基本方針

- **TypeScript** を使用し、素の JavaScript (`*.js`) での実装は避ける
- `tsconfig.json` は `strict: true` を基本とする
- フォーマッタ・リンターには **Biome.js** を使用する
  - `biome.json` で Lint・フォーマットの設定を一元管理する
  - 実行は `npm run lint` / `npm run format` (Biome.js を呼び出すスクリプト) を基本とする

## インデント・行の長さ

- インデントは **スペース 2 つ** とする (タブは禁止) (Biome.js 既定値)
- 1行あたりの最大文字数は **80文字** とする (Biome.js 既定値)

## 命名

- 変数・関数・メソッド名は **`camelCase`** で命名する
- クラス・型・インターフェース・コンポーネント名は **`PascalCase`** で命名する
- 定数は [コーディング規約](./coding-styles) の共通ルール通り `SCREAMING_CASE` で命名する
- アクロニム (`URL`, `ID`, `HTML` など) の表記は、 TypeScript/JavaScript コミュニティで広く使われる慣習に従う (強制的な大文字化ルールは設けない)

## コメント (JSDoc)

- すべてのクラス・関数・メソッド・エクスポートされる型には **JSDoc** を付す
- `@param` / `@returns` / `@throws` を、該当する場合は明確に記述する
- コメント本文は日本語で記述し、 [コーディング規約](./coding-styles) の「コメントの記述スタイル」(応答します調) に従う

```typescript
/**
 * 記事を示すモデル
 */
class Article {
  /**
   * 名称を指定したインスタンスを生成して応答します。
   *
   * @param name - 記事の名称
   */
  constructor(name: string) {
    // ...
  }

  /**
   * この記事の名称を応答します。
   *
   * @returns 名称
   */
  name(): string {
    // ...
  }

  /**
   * この記事に対し、指定の記事が持つ内容・属性をマージしたコピーを応答します。
   *
   * この操作では、この記事の内容・属性は変更されません。
   *
   * @param article - マージ対象の記事
   * @returns マージされた記事
   */
  copyWith(article: Article): Article {
    // ...
  }
}
```

## 例外管理

- すべてのエラーは **`AppError`** (`Error` を継承) を継承するものとする
- システム全体でのエラーハンドリングは、 `AppError` を基底とするエラー体系を通じて統一的に行う

### エラークラスの実装例

```typescript
class ArticleNotFoundError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

// 使用例
throw new ArticleNotFoundError("記事の取得において、指定された記事が見つかりませんでした");
```

- コンストラクタのシグネチャ: `constructor(message: string, options?: { cause?: unknown })`
- エラーの種別はエラークラスの型で判別されるため、同一エラークラスで複数のエラーコードを使い分けることはしない
