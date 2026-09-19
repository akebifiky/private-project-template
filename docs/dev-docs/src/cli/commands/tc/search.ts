import { join } from "node:path";
import { Command } from "commander";
import type { TcEntry } from "../../../models/tc/tc-entry.js";
import { TcQueryService } from "../../../models/tc/tc-query-service.js";

const TC_DIR = join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "content",
  "technical-concerns",
);

/**
 * TC エントリが検索キーワードに合致するかどうかを判定します (タイトル・タグ・トリガー条件を対象) 。
 *
 * @param entry - 判定対象の TC エントリ。
 * @param lowerCaseQuery - 検索キーワード (小文字化済み) 。
 * @returns 合致する場合は true。
 */
function matchesQuery(entry: TcEntry, lowerCaseQuery: string): boolean {
  return (
    entry.id().toLowerCase().includes(lowerCaseQuery) ||
    entry.title().toLowerCase().includes(lowerCaseQuery) ||
    entry.triggerSummary().toLowerCase().includes(lowerCaseQuery) ||
    entry.tags().some((tag) => tag.toLowerCase().includes(lowerCaseQuery))
  );
}

const TABLE_HEADER_CELLS = [
  "ID",
  "概要",
  "タグ",
  "トリガー条件 (要約)",
] as const;

/**
 * TC エントリの配列から、Markdown テーブルの行 (セルの配列) の一覧を組み立てて応答します。
 *
 * @param entries - TC 番号昇順のエントリ配列。
 * @returns ヘッダー行を含む、各行のセル配列の配列。
 */
function buildTableRows(entries: readonly TcEntry[]): string[][] {
  const dataRows = entries.map((entry) => [
    `[${entry.id()}](${entry.fileName()})`,
    entry.title(),
    entry.tags().join(", "),
    entry.triggerSummary(),
  ]);
  return [[...TABLE_HEADER_CELLS], ...dataRows];
}

/**
 * セルの配列の配列を、桁を揃えた GitHub Flavored Markdown のテーブルへ整形して応答します。
 *
 * @param rows - ヘッダー行を含む、各行のセル配列の配列。
 * @returns 整形済みの Markdown テーブル文字列 (末尾に改行は含まない) 。
 */
function formatMarkdownTable(rows: readonly string[][]): string {
  const columnCount = rows[0].length;
  const columnWidths = Array.from({ length: columnCount }, (_, columnIndex) =>
    Math.max(...rows.map((row) => Array.from(row[columnIndex]).length)),
  );

  const formatRow = (row: readonly string[]): string =>
    `| ${row.map((cell, columnIndex) => cell.padEnd(columnWidths[columnIndex], " ")).join(" | ")} |`;

  const separatorRow = `| ${columnWidths.map((width) => "-".repeat(width)).join(" | ")} |`;

  const [headerRow, ...dataRows] = rows;
  return [formatRow(headerRow), separatorRow, ...dataRows.map(formatRow)].join(
    "\n",
  );
}

/**
 * Open な TC エントリの配列から、Markdown テーブルを生成して応答します (CLI 出力用) 。
 *
 * @param entries - TC 番号昇順の、Open な TC のエントリ配列。
 * @returns 整形済みの Markdown テーブル文字列 (末尾に改行は含まない) 。
 */
function renderOpenTcTable(entries: readonly TcEntry[]): string {
  return formatMarkdownTable(buildTableRows(entries));
}

/**
 * Open な TC 一覧を検索し、標準出力へ Markdown テーブル形式で出力します。
 *
 * `query` を指定すると、ID・タイトル・タグ・トリガー条件を対象に部分一致
 * (大文字小文字を区別しない) で絞り込みます。未指定の場合は Open な TC すべてを出力します。
 *
 * @param query - 検索キーワード。
 * @returns 応答なし。
 */
function searchTc(query: string | undefined): void {
  const entries = new TcQueryService(TC_DIR).findAllOpen();

  const targetEntries = query
    ? entries.filter((entry) => matchesQuery(entry, query.toLowerCase()))
    : entries;

  if (targetEntries.length === 0) {
    console.log(
      query
        ? `該当する Open な TC が見つかりませんでした (検索キーワード: "${query}") 。`
        : "現在 Open な TC はありません。",
    );
    return;
  }

  console.log(renderOpenTcTable(targetEntries));
  console.log(
    `\n(${targetEntries.length} 件 / Open な TC 全 ${entries.length} 件)`,
  );
}

/**
 * TC 検索コマンド (`tc search`) を生成して応答します。
 *
 * @returns 生成された Commander コマンド。
 */
export function createTcSearchCommand(): Command {
  return new Command("search")
    .description("Open な TC 一覧を検索します")
    .option(
      "--query <keyword>",
      "ID・タイトル・タグ・トリガー条件に対する検索キーワード",
    )
    .action((options: { query?: string }) => {
      try {
        searchTc(options.query);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`TC の検索に失敗しました: ${message}`);
        process.exitCode = 1;
      }
    });
}
