import { readdirSync } from "node:fs";
import { join } from "node:path";
import { parseMarkdownFile } from "../markdown/frontmatter.js";
import { assertNoDuplicateNumbers, type NumberedFile } from "../numbering.js";
import { TcEntry } from "./tc-entry.js";
import type { TcFrontmatter } from "./tc-frontmatter.js";

const TC_FILE_NAME_PATTERN = /^TC-(\d{4})-.+\.md$/;

/**
 * TC ディレクトリ配下の TC ファイル群から、Open な TC エントリを検索するクラスです。
 *
 * 併せて、Open/Resolved を問わず TC 番号の重複がないこと、および status: open な
 * TC すべてに trigger_summary が設定されていることを検証します (満たさない場合は例外を送出) 。
 */
export class TcQueryService {
	readonly #tcDir: string;

	/**
	 * TC ファイルが配置されているディレクトリを指定したインスタンスを生成して応答します。
	 *
	 * @param tcDir - TC ファイルが配置されているディレクトリの絶対パス。
	 */
	constructor(tcDir: string) {
		this.#tcDir = tcDir;
	}

	/**
	 * TC ディレクトリ配下から status: open の TC ファイルのみを読み込み、
	 * TC 番号の昇順に並んだ、Open な TC のエントリの一覧を応答します。
	 *
	 * @returns TC 番号の昇順に並んだ、Open な TC のエントリの配列。
	 */
	findAllOpen(): TcEntry[] {
		const fileNames = readdirSync(this.#tcDir).filter((name) =>
			TC_FILE_NAME_PATTERN.test(name),
		);

		// 番号の重複は Open/Resolved を問わず TC 全体で検証する (並行するブランチが
		// 同じ番号を採番した場合、いずれかが Resolved 済みでも採番のやり直しが必要なため) 。
		const allNumberedFiles: NumberedFile[] = [];
		const entries: TcEntry[] = [];
		for (const fileName of fileNames) {
			const filePath = join(this.#tcDir, fileName);
			const match = fileName.match(TC_FILE_NAME_PATTERN);
			if (!match) {
				throw new Error(
					`TC 一覧の構築において、${fileName} のファイル名が規約 (TC-XXXX-slug.md) に一致しません`,
				);
			}
			const number = Number.parseInt(match[1], 10);
			allNumberedFiles.push({ number, fileName });

			const { frontmatter } = parseMarkdownFile<TcFrontmatter>(filePath);
			if (frontmatter.status !== "open") {
				continue;
			}
			if (!frontmatter.trigger_summary) {
				throw new Error(
					`TC 一覧の構築において、${fileName} は status: open ですが trigger_summary が設定されていません`,
				);
			}

			entries.push(
				new TcEntry(
					number,
					fileName,
					frontmatter.id,
					frontmatter.title,
					frontmatter.tags,
					frontmatter.trigger_summary,
				),
			);
		}

		assertNoDuplicateNumbers(allNumberedFiles, "TC");

		return entries.sort((left, right) => left.number() - right.number());
	}
}
