/**
 * テンプレート変数の定義
 *
 * テンプレートのマニフェストで宣言され、入力の検証と対話入力の生成に用いられます。
 */
export interface VariableDefinition {
  /** 変数名 (kebab-case) 。 `--vars` のキーとして指定されます。 */
  readonly name: string;
  /** 変数の説明。対話入力の問いかけに表示されます。 */
  readonly description: string;
  /** 選択肢。指定した場合、いずれかの値のみを許容します。 */
  readonly choices?: readonly string[];
  /** 既定値。指定した場合、未指定でもその値で解決されます。 */
  readonly default?: string;
}

/**
 * 変数名をキー、指定値を値とするテンプレート変数の組
 */
export type VariableValues = Readonly<Record<string, string>>;
