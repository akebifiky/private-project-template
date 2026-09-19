import { basename } from "node:path";

/**
 * ADR 一覧の表示 (Web ページ・CLI 出力の双方) に必要な、1件あたりの情報を示す型です。
 *
 * Web ページ側へは `usePluginData` 経由で JSON としてシリアライズされて渡るため、
 * (メソッドを持つ {@link AdrEntry} ではなく) プレーンなデータ型として定義しています。
 */
export interface AdrIndexRow {
	readonly slug: string;
	readonly displayHeading: string;
}

/**
 * ADR の1エントリを示すモデルです。
 */
export class AdrEntry {
	readonly #number: number;
	readonly #fileName: string;
	readonly #headingText: string;
	readonly #status: string;
	readonly #supersededByNumbers: readonly string[];

	/**
	 * 値を指定したインスタンスを生成して応答します。
	 *
	 * @param number - ADR 番号。
	 * @param fileName - ファイル名。
	 * @param headingText - 見出しテキスト。
	 * @param status - ステータス。
	 * @param supersededByNumbers - この ADR を Supersede している ADR 番号の一覧。
	 */
	constructor(
		number: number,
		fileName: string,
		headingText: string,
		status: string,
		supersededByNumbers: readonly string[],
	) {
		this.#number = number;
		this.#fileName = fileName;
		this.#headingText = headingText;
		this.#status = status;
		this.#supersededByNumbers = supersededByNumbers;
	}

	/**
	 * ADR 番号を応答します。
	 *
	 * @returns ADR 番号。
	 */
	number(): number {
		return this.#number;
	}

	/**
	 * ファイル名を応答します。
	 *
	 * @returns ファイル名。
	 */
	fileName(): string {
		return this.#fileName;
	}

	/**
	 * 見出しテキストを応答します。
	 *
	 * @returns 見出しテキスト。
	 */
	headingText(): string {
		return this.#headingText;
	}

	/**
	 * ステータスを応答します。
	 *
	 * @returns ステータス。
	 */
	status(): string {
		return this.#status;
	}

	/**
	 * スラッグ (拡張子を除いたファイル名) を応答します。
	 *
	 * @returns スラッグ。
	 */
	slug(): string {
		return basename(this.#fileName, ".md");
	}

	/**
	 * Superseded 注記を組み立てて応答します。
	 *
	 * 見出しテキストに既に "Superseded" の語が含まれている場合 (手動で複雑な注記が
	 * 記載されているケース) は、機械的な付記との二重表記を避けるため空文字列を応答します。
	 *
	 * @returns 注記文字列 (付記が不要な場合は空文字列) 。
	 */
	supersededNote(): string {
		if (this.#supersededByNumbers.length === 0) {
			return "";
		}
		if (this.#headingText.includes("Superseded")) {
			return "";
		}
		return ` (Superseded by ${this.#supersededByNumbers.join(", ")})`;
	}

	/**
	 * Superseded 注記を含む、表示用の見出しを応答します。
	 *
	 * @returns 表示用の見出し。
	 */
	displayHeading(): string {
		return `${this.#headingText}${this.supersededNote()}`;
	}

	/**
	 * Web ページでの一覧表示に必要な情報へ変換して応答します。
	 *
	 * @returns ADR 一覧の1行分のデータ。
	 */
	toIndexRow(): AdrIndexRow {
		return {
			slug: this.slug(),
			displayHeading: this.displayHeading(),
		};
	}

	/**
	 * Markdown の箇条書き1行に変換して応答します (CLI 出力用) 。
	 *
	 * @returns Markdown 文字列 (1行) 。
	 */
	toMarkdownListItem(): string {
		return `- [${this.displayHeading()}](${this.slug()}.md)`;
	}
}
