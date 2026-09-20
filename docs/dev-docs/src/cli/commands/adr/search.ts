import { join } from "node:path";
import { Command } from "commander";
import type { AdrEntry } from "../../../models/adr/adr-entry.js";
import { AdrQueryService } from "../../../models/adr/adr-query-service.js";

const ADR_DIR = join(__dirname, "..", "..", "..", "..", "content", "adr");

/**
 * ADR エントリが検索キーワードに合致するかどうかを判定します (見出し・ファイル名・ステータスを対象) 。
 *
 * @param entry - 判定対象の ADR エントリ。
 * @param lowerCaseQuery - 検索キーワード (小文字化済み) 。
 * @returns 合致する場合は true。
 */
function matchesQuery(entry: AdrEntry, lowerCaseQuery: string): boolean {
  return (
    entry.headingText().toLowerCase().includes(lowerCaseQuery) ||
    entry.fileName().toLowerCase().includes(lowerCaseQuery) ||
    entry.status().toLowerCase().includes(lowerCaseQuery)
  );
}

/**
 * ADR 一覧を検索し、標準出力へ Markdown 箇条書き形式で出力します。
 *
 * `query` を指定すると、見出し・ファイル名・ステータスを対象に部分一致
 * (大文字小文字を区別しない) で絞り込みます。未指定の場合は全 ADR を出力します。
 *
 * @param query - 検索キーワード。
 * @returns 応答なし。
 */
function searchAdr(query: string | undefined): void {
  const entries = new AdrQueryService(ADR_DIR).findAll();

  const targetEntries = query
    ? entries.filter((entry) => matchesQuery(entry, query.toLowerCase()))
    : entries;

  if (targetEntries.length === 0) {
    console.log(
      `該当する ADR が見つかりませんでした (検索キーワード: "${query}") 。`,
    );
    return;
  }

  console.log(
    targetEntries.map((entry) => entry.toMarkdownListItem()).join("\n"),
  );
  console.log(`\n(${targetEntries.length} 件 / 全 ${entries.length} 件)`);
}

/**
 * ADR 検索コマンド (`adr search`) を生成して応答します。
 *
 * @returns 生成された Commander コマンド。
 */
export function createAdrSearchCommand(): Command {
  return new Command("search")
    .description("ADR 一覧を検索します")
    .option(
      "--query <keyword>",
      "見出し・ファイル名・ステータスに対する検索キーワード",
    )
    .action((options: { query?: string }) => {
      try {
        searchAdr(options.query);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`ADR の検索に失敗しました: ${message}`);
        process.exitCode = 1;
      }
    });
}
