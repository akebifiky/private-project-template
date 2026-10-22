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
