import { join } from "node:path";
import { Command } from "commander";
import { ParenSpacingLintService } from "../../../models/common-format/paren-spacing-lint-service.js";
import type { ParenSpacingViolation } from "../../../models/common-format/paren-spacing-violation.js";

const CONTENT_DIR = join(__dirname, "..", "..", "..", "..", "content");
// 違反が大量にある場合でも標準出力が肥大化しないよう、詳細表示件数の上限を設ける。
const MAX_REPORTED_VIOLATIONS = 50;

/**
 * 検出した括弧スペース違反を、ファイル別にグループ化した箇条書き形式で整形します。
 * 件数が {@link MAX_REPORTED_VIOLATIONS} を超える場合は先頭のみを表示し、残数を注記します。
 *
 * @param violations - 検出した違反の一覧。
 * @returns 整形済みの報告文字列。
 */
function renderViolationReport(
  violations: readonly ParenSpacingViolation[],
): string {
  const displayed = violations.slice(0, MAX_REPORTED_VIOLATIONS);
  const omittedCount = violations.length - displayed.length;

  const lines = displayed
    .map(
      (violation) =>
        `  - ${violation.filePath}:${violation.line}:${violation.column}: ${violation.excerpt}`,
    )
    .join("\n");

  return omittedCount > 0 ? `${lines}\n  ...他 ${omittedCount} 件` : lines;
}

/**
 * `docs/dev-docs/content` 配下の Markdown ファイルを対象に、共通フォーマット・規則3の
 * 例外表 (括弧の内側にスペースを設けない) の違反を検証、または `fix` 指定時は修正します。
 *
 * @param fix - true の場合、検出した違反を機械的に修正してファイルへ書き戻します。
 * @returns 応答なし。`fix` が false で違反が見つかった場合は例外を送出します。
 */
function lintCommonFormat(fix: boolean): void {
  const service = new ParenSpacingLintService(CONTENT_DIR);
  const results = service.scan();
  const violations = results.flatMap((result) => result.violations);

  if (fix) {
    const changedResults = results.filter((result) => result.changed);
    service.applyFixes(changedResults);
    console.log(
      `共通フォーマットの括弧スペース違反を修正しました (${violations.length}件、対象${changedResults.length}ファイル) 。`,
    );
    return;
  }

  if (violations.length > 0) {
    throw new Error(
      `共通フォーマット (括弧の内側にスペースを設けない規則、project-rules/common-format.md 規則3) の違反が` +
        `${violations.length}件見つかりました:\n${renderViolationReport(violations)}\n\n` +
        "npm run fix:common-format を実行すると機械的に修正できます。",
    );
  }

  console.log(
    `共通フォーマットの括弧スペース違反を検証しました (${results.length}ファイル) 。違反はありません。`,
  );
}

/**
 * 共通フォーマットの検証コマンド ( `common-format lint` ) を生成して応答します。
 *
 * @returns 生成された Commander コマンド。
 */
export function createCommonFormatLintCommand(): Command {
  return new Command("lint")
    .description(
      "Markdown の共通フォーマット (括弧の内側にスペースを設けない規則) を検証します",
    )
    .option("--fix", "検出した違反を機械的に修正します")
    .action((options: { fix?: boolean }) => {
      try {
        lintCommonFormat(Boolean(options.fix));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`共通フォーマットの検証に失敗しました: ${message}`);
        process.exitCode = 1;
      }
    });
}
