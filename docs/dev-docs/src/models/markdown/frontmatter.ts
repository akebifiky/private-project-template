import { readFileSync } from "node:fs";
import * as yaml from "js-yaml";

/**
 * Markdown ファイルを Frontmatter (YAML) と本文に分離した結果を示す型です。
 */
export interface ParsedMarkdown<T> {
  readonly frontmatter: T;
  readonly body: string;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * 指定したパスの Markdown ファイルを読み込み、Frontmatter と本文に分離して応答します。
 *
 * @param filePath - 読み込む Markdown ファイルの絶対パス。
 * @returns Frontmatter (型 T として解釈) と本文からなる解析結果。
 */
export function parseMarkdownFile<T>(filePath: string): ParsedMarkdown<T> {
  const raw = readFileSync(filePath, "utf-8");
  const match = raw.match(FRONTMATTER_PATTERN);
  if (!match) {
    throw new Error(
      `Markdown ファイルの解析において、${filePath} に Frontmatter が見つかりません`,
    );
  }

  const [, frontmatterSource, body] = match;
  const frontmatter = yaml.load(frontmatterSource) as T;
  return { frontmatter, body };
}

/**
 * Markdown 本文から先頭の H1 見出しのテキストを抽出して応答します。
 *
 * @param body - Markdown 本文。
 * @param filePath - エラーメッセージに含める、解析対象ファイルの絶対パス。
 * @returns H1 見出しのテキスト (先頭の "# " を除いた文字列) 。
 */
export function extractH1Heading(body: string, filePath: string): string {
  const match = body.match(/^#\s+(.+)$/m);
  if (!match) {
    throw new Error(
      `Markdown ファイルの解析において、${filePath} に H1 見出しが見つかりません`,
    );
  }
  return match[1].trim();
}
