/**
 * TC エントリを Web ページ側へ渡すためのプレーンなデータ型です。
 *
 * Web ページ側へは `usePluginData` 経由で JSON としてシリアライズされて渡るため、
 * (メソッドを持つ {@link TcEntry} ではなく) プレーンなデータ型として定義しています。
 */
export interface TcEntryData {
  readonly number: number;
  readonly fileName: string;
  readonly id: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly triggerSummary: string;
}

/**
 * Open な TC の1エントリを示すモデルです。
 */
export class TcEntry {
  readonly #number: number;
  readonly #fileName: string;
  readonly #id: string;
  readonly #title: string;
  readonly #tags: readonly string[];
  readonly #triggerSummary: string;

  /**
   * 値を指定したインスタンスを生成して応答します。
   *
   * @param number - TC 番号。
   * @param fileName - ファイル名。
   * @param id - TC の ID。
   * @param title - タイトル。
   * @param tags - タグの一覧。
   * @param triggerSummary - トリガー条件の要約。
   */
  constructor(
    number: number,
    fileName: string,
    id: string,
    title: string,
    tags: readonly string[],
    triggerSummary: string,
  ) {
    this.#number = number;
    this.#fileName = fileName;
    this.#id = id;
    this.#title = title;
    this.#tags = tags;
    this.#triggerSummary = triggerSummary;
  }

  /**
   * TC 番号を応答します。
   *
   * @returns TC 番号。
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
   * TC の ID を応答します。
   *
   * @returns TC の ID。
   */
  id(): string {
    return this.#id;
  }

  /**
   * タイトルを応答します。
   *
   * @returns タイトル。
   */
  title(): string {
    return this.#title;
  }

  /**
   * タグの一覧を応答します。
   *
   * @returns タグの一覧。
   */
  tags(): readonly string[] {
    return this.#tags;
  }

  /**
   * トリガー条件の要約を応答します。
   *
   * @returns トリガー条件の要約。
   */
  triggerSummary(): string {
    return this.#triggerSummary;
  }

  /**
   * Web ページでの一覧表示に必要な情報へ変換して応答します。
   *
   * @returns TC エントリのプレーンなデータ。
   */
  toPlainObject(): TcEntryData {
    return {
      number: this.#number,
      fileName: this.#fileName,
      id: this.#id,
      title: this.#title,
      tags: this.#tags,
      triggerSummary: this.#triggerSummary,
    };
  }
}
