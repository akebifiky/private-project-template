import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
	extractH1Heading,
	parseMarkdownFile,
} from "../markdown/frontmatter.js";
import { assertNoDuplicateNumbers } from "../numbering.js";
import { AdrEntry } from "./adr-entry.js";
import type { AdrFrontmatter } from "./adr-frontmatter.js";

const ADR_FILE_NAME_PATTERN = /^ADR-(\d{4})-.+\.md$/;
const ADR_NUMBER_PATTERN = /^(ADR-\d{4})/;

/**
 * ADR ディレクトリ配下の ADR ファイル群から ADR エントリを検索するクラスです。
 *
 * ADR 番号の重複がないことも併せて検証します (満たさない場合は例外を送出) 。
 */
export class AdrQueryService {
	readonly #adrDir: string;

	/**
	 * ADR ファイルが配置されているディレクトリを指定したインスタンスを生成して応答します。
	 *
	 * @param adrDir - ADR ファイルが配置されているディレクトリの絶対パス。
	 */
	constructor(adrDir: string) {
		this.#adrDir = adrDir;
	}

	/**
	 * ADR ディレクトリ配下の各 ADR ファイルを読み込み、ADR 番号の昇順に並んだ
	 * エントリの一覧を応答します。
	 *
	 * @returns ADR 番号の昇順に並んだエントリの配列。
	 */
	findAll(): AdrEntry[] {
		const fileNames = readdirSync(this.#adrDir).filter((name) =>
			ADR_FILE_NAME_PATTERN.test(name),
		);

		const entries = fileNames.map((fileName) => this.#loadEntry(fileName));

		assertNoDuplicateNumbers(
			entries.map((entry) => ({
				number: entry.number(),
				fileName: entry.fileName(),
			})),
			"ADR",
		);

		return entries.sort((left, right) => left.number() - right.number());
	}

	/**
	 * 指定した ADR ファイルを読み込み、ADR エントリを構築して応答します。
	 *
	 * @param fileName - ADR ファイル名。
	 * @returns 構築された ADR エントリ。
	 */
	#loadEntry(fileName: string): AdrEntry {
		const filePath = join(this.#adrDir, fileName);
		const match = fileName.match(ADR_FILE_NAME_PATTERN);
		if (!match) {
			throw new Error(
				`ADR 一覧の構築において、${fileName} のファイル名が規約 (ADR-XXXX-slug.md) に一致しません`,
			);
		}

		const { frontmatter, body } = parseMarkdownFile<AdrFrontmatter>(filePath);
		const headingText = extractH1Heading(body, filePath);
		const supersededByNumbers = (frontmatter.superseded_by ?? []).map(
			(reference) => this.#extractAdrNumber(reference, filePath),
		);

		return new AdrEntry(
			Number.parseInt(match[1], 10),
			fileName,
			headingText,
			frontmatter.status,
			supersededByNumbers,
		);
	}

	/**
	 * superseded_by の要素 (ADR ファイル名) から、表示用の ADR 番号 (例: "ADR-0102") を
	 * 抽出して応答します。
	 *
	 * @param reference - superseded_by に記載された ADR ファイル名 (拡張子なし) 。
	 * @param filePath - エラーメッセージに含める、解析対象ファイルの絶対パス。
	 * @returns 抽出した ADR 番号。
	 */
	#extractAdrNumber(reference: string, filePath: string): string {
		const match = reference.match(ADR_NUMBER_PATTERN);
		if (!match) {
			throw new Error(
				`ADR 一覧の構築において、${filePath} の superseded_by 値 "${reference}" から ADR 番号を抽出できません`,
			);
		}
		return match[1];
	}
}
