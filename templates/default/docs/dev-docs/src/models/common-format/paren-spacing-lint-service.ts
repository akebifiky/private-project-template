import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import type { ParenSpacingViolation } from "./paren-spacing-violation.js";
import type { ScanResult } from "./scan-result.js";

const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx"]);
const CODE_FENCE_PATTERN = /^\s*```/;
const INLINE_CODE_PATTERN = /`[^`\n]*`/g;
const OPEN_PAREN_SPACE_PATTERN = /\(( +)/g;
const CLOSE_PAREN_SPACE_PATTERN = /( +)\)/g;
// インラインコード範囲を空白以外の同じ文字数の制御文字に置き換えるためのプレースホルダー。
// スペースや括弧そのものに置き換えると誤検知・取りこぼしが生じるため、両方に該当しない文字を用いる。
const REDACT_CHAR = "\x00";
const EXCERPT_CONTEXT_LENGTH = 24;

/**
 * 指定したディレクトリ配下の Markdown ファイルを対象に、共通フォーマット・規則3の
 * 例外表 (括弧の内側にスペースを設けない) の違反を検証・修正するクラスです。
 *
 * コードフェンス (` ``` ` で囲まれた範囲) 内、およびインラインコード (バッククォートで
 * 囲まれた範囲) 内は検査対象外です。
 */
export class ParenSpacingLintService {
  readonly #contentDir: string;

  /**
   * 検証対象の Markdown ファイルが配置されているディレクトリを指定したインスタンスを
   * 生成して応答します。
   *
   * @param contentDir - 検証対象ディレクトリの絶対パス。
   */
  constructor(contentDir: string) {
    this.#contentDir = contentDir;
  }

  /**
   * `contentDir` 配下の Markdown ファイル (`.md`・`.mdx`) を走査し、ファイルごとの
   * 走査結果の一覧を応答します。
   *
   * @returns ファイルパスの昇順に並んだ走査結果の配列。
   */
  scan(): ScanResult[] {
    return this.#collectMarkdownFiles(this.#contentDir).map((filePath) =>
      this.#scanFile(filePath),
    );
  }

  /**
   * 走査結果のうち、変更を含むものをファイルへ書き戻します。
   *
   * @param results - {@link scan} で得られた走査結果の一覧。
   * @returns 応答なし。
   */
  applyFixes(results: readonly ScanResult[]): void {
    for (const result of results) {
      if (result.changed) {
        writeFileSync(result.filePath, result.fixedText, "utf-8");
      }
    }
  }

  /**
   * 指定したディレクトリ配下の Markdown ファイル (`.md`・`.mdx`) を再帰的に収集して応答します。
   *
   * @param dir - 探索対象ディレクトリの絶対パス。
   * @returns 絶対パスの配列 (ディレクトリ・ファイル名の昇順) 。
   */
  #collectMarkdownFiles(dir: string): string[] {
    const result: string[] = [];
    for (const name of readdirSync(dir).sort()) {
      const entryPath = join(dir, name);
      const stat = statSync(entryPath);
      if (stat.isDirectory()) {
        result.push(...this.#collectMarkdownFiles(entryPath));
        continue;
      }
      if (MARKDOWN_EXTENSIONS.has(extname(name))) {
        result.push(entryPath);
      }
    }
    return result;
  }

  /**
   * 指定した Markdown ファイルを走査し、括弧スペース違反の検出と修正後テキストの
   * 組み立てを行います。コードフェンス (` ``` ` で囲まれた範囲) は検査対象外です。
   *
   * @param filePath - 走査対象ファイルの絶対パス。
   * @returns 走査結果 (検出した違反・修正後テキスト・変更有無) 。
   */
  #scanFile(filePath: string): ScanResult {
    const originalText = readFileSync(filePath, "utf-8");
    const displayPath = relative(this.#contentDir, filePath);
    const lines = originalText.split("\n");
    const violations: ParenSpacingViolation[] = [];
    const fixedLines: string[] = [];

    let inFence = false;
    lines.forEach((line, index) => {
      if (CODE_FENCE_PATTERN.test(line)) {
        inFence = !inFence;
        fixedLines.push(line);
        return;
      }
      if (inFence) {
        fixedLines.push(line);
        return;
      }

      const { fixedLine, violationColumns } = this.#fixLine(line);
      for (const column of violationColumns) {
        violations.push({
          filePath: displayPath,
          line: index + 1,
          column,
          excerpt: this.#buildExcerpt(line, column),
        });
      }
      fixedLines.push(fixedLine);
    });

    const fixedText = fixedLines.join("\n");
    return {
      filePath,
      violations,
      originalText,
      fixedText,
      changed: fixedText !== originalText,
    };
  }

  /**
   * 行内のインラインコード (バッククォートで囲まれた範囲) を、括弧スペース検査の対象外と
   * するため、同じ文字数の制御文字に置き換えます。
   *
   * 置換後も文字列長・非コード範囲の文字位置は元の行と一致するため、マスク後の行に対する
   * マッチ位置 (列番号) をそのまま元の行の位置として扱えます。
   *
   * @param line - マスク対象の1行分のテキスト (コードフェンス外であることが前提) 。
   * @returns インラインコード範囲を制御文字に置き換えた文字列。
   */
  #maskInlineCode(line: string): string {
    return line.replace(INLINE_CODE_PATTERN, (matched) =>
      REDACT_CHAR.repeat(matched.length),
    );
  }

  /**
   * マスク済みの行から、括弧の内側にある半角スペースの範囲 (削除対象) を検出します。
   *
   * `(` 直後の連続スペース・`)` 直前の連続スペースの両方を対象とし、`( )` のように
   * 単一のスペースが両条件に該当する場合は重複した範囲として検出されるが、
   * 呼び出し側で削除対象位置の集合として扱うため結果には影響しない。
   *
   * @param maskedLine - {@link #maskInlineCode} でインラインコードをマスクした行。
   * @returns 削除すべきスペース範囲 (半開区間 [開始位置, 終了位置) ) の配列。
   */
  #locateViolationRanges(maskedLine: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];

    for (const match of maskedLine.matchAll(OPEN_PAREN_SPACE_PATTERN)) {
      const spaces = match[1];
      const start = (match.index ?? 0) + 1;
      ranges.push([start, start + spaces.length]);
    }
    for (const match of maskedLine.matchAll(CLOSE_PAREN_SPACE_PATTERN)) {
      const spaces = match[1];
      const start = match.index ?? 0;
      ranges.push([start, start + spaces.length]);
    }

    return ranges;
  }

  /**
   * 違反範囲の周辺テキストを、報告用の短い抜粋として整形します。
   *
   * @param line - 元の行テキスト。
   * @param column - 違反範囲の開始位置 (1始まり) 。
   * @returns 抜粋文字列 (行の前後が途切れる場合は "..." を付与) 。
   */
  #buildExcerpt(line: string, column: number): string {
    const start = Math.max(0, column - 1 - EXCERPT_CONTEXT_LENGTH);
    const end = Math.min(line.length, column - 1 + EXCERPT_CONTEXT_LENGTH);
    const prefix = start > 0 ? "..." : "";
    const suffix = end < line.length ? "..." : "";
    return `${prefix}${line.slice(start, end)}${suffix}`;
  }

  /**
   * 1行分のテキストを検査し、違反を除去した行と、検出した違反の列位置一覧を応答します。
   *
   * @param line - 元の行テキスト (コードフェンス外であることが前提) 。
   * @returns 修正後の行と、検出した違反の列位置 (1始まり、重複排除済み) の配列。
   */
  #fixLine(line: string): { fixedLine: string; violationColumns: number[] } {
    const maskedLine = this.#maskInlineCode(line);
    const ranges = this.#locateViolationRanges(maskedLine);
    if (ranges.length === 0) {
      return { fixedLine: line, violationColumns: [] };
    }

    const toDelete = new Array<boolean>(line.length).fill(false);
    for (const [start, end] of ranges) {
      for (let i = start; i < end; i += 1) {
        toDelete[i] = true;
      }
    }

    const violationColumns = [
      ...new Set(ranges.map(([start]) => start + 1)),
    ].sort((left, right) => left - right);

    const fixedChars: string[] = [];
    for (let i = 0; i < line.length; i += 1) {
      if (!toDelete[i]) {
        fixedChars.push(line[i]);
      }
    }

    return { fixedLine: fixedChars.join(""), violationColumns };
  }
}
