import type { ParenSpacingViolation } from "./paren-spacing-violation.js";

/**
 * 1ファイルに対する走査結果を示す型です。
 */
export interface ScanResult {
  readonly filePath: string;
  readonly violations: readonly ParenSpacingViolation[];
  readonly originalText: string;
  readonly fixedText: string;
  readonly changed: boolean;
}
