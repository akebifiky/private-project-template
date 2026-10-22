/**
 * 括弧 (`()`) の内側に半角スペースが入っている違反1件を示す型です
 * (共通フォーマット・規則3の例外表: 括弧の内側にスペースを設けない) 。
 */
export interface ParenSpacingViolation {
  readonly filePath: string;
  readonly line: number;
  readonly column: number;
  readonly excerpt: string;
}
