/**
 * 本ツールで扱うエラーの基底クラス
 */
export class AppError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/**
 * テンプレート変数の指定 (`--vars` や選択肢) が不正であることを示すエラー
 */
export class VariableError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/**
 * テンプレートのマニフェストが不正であることを示すエラー
 */
export class ManifestError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/**
 * スキャフォールディングの実行に失敗したことを示すエラー
 */
export class ScaffoldError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/**
 * 出力先に内容の異なる既存のファイルがあり、適用できないことを示すエラー
 */
export class ScaffoldConflictError extends ScaffoldError {
  /** 衝突したファイルの出力先からの相対パス */
  readonly conflicts: readonly string[];

  constructor(conflicts: readonly string[]) {
    super(
      `出力先に内容の異なる既存のファイルがあります (${conflicts.length} 件):\n${conflicts
        .map((path) => `  ${path}`)
        .join(
          "\n",
        )}\n--on-conflict で skip (既存を維持) または overwrite (上書き) を指定できます。--dry-run で適用内容を確認できます。`,
    );
    this.conflicts = conflicts;
  }
}
