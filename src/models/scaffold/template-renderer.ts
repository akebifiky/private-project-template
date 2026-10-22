import { Eta } from "eta";
import { ScaffoldError } from "../app-error.js";

/** テンプレートファイルとして描画対象になる拡張子 */
export const TEMPLATE_EXTENSION = ".eta";

/**
 * Eta でテンプレート文字列を描画するレンダラー
 *
 * 出力は Markdown・YAML・JSON などを対象とするため、 HTML エスケープは行いません。
 * また、タグ直後の改行は自動では取り除かず、記述どおりに出力します。
 * 制御構文のみの行を出力に残したくない場合は、 `<% if (...) { -%>` のように `-%>` で閉じてください。
 */
export class TemplateRenderer {
  private readonly eta = new Eta({
    autoEscape: false,
    autoTrim: false,
    useWith: false,
  });

  /**
   * テンプレート文字列を描画して応答します。
   *
   * @param template - テンプレートの内容
   * @param context - テンプレート内で `it` として参照できる値
   * @param name - エラーメッセージに表示するテンプレートの名前
   * @returns 描画結果
   * @throws {ScaffoldError} テンプレートの構文エラーや未定義変数の参照などで描画に失敗した場合
   */
  render(
    template: string,
    context: Record<string, unknown>,
    name: string,
  ): string {
    try {
      return this.eta.renderString(template, context);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new ScaffoldError(
        `テンプレート ${name} の描画に失敗しました: ${reason}`,
        { cause: error },
      );
    }
  }
}
