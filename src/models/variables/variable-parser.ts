import { VariableError } from "../app-error.js";
import type { VariableValues } from "./variable-definition.js";

/**
 * `--vars` オプションの文字列を解析して応答します。
 *
 * `key=value` をカンマで区切って列挙する形式です。キーと値の前後の空白は
 * 取り除かれ、値には `=` を含めることができます。
 *
 * @param text - 解析対象の文字列 (例: `project-name=Example, git-service=github`)
 * @returns 変数名と指定値の組
 * @throws {VariableError} 形式が不正な場合、またはキーが重複している場合
 */
export function parseVariables(text: string): VariableValues {
  const values: Record<string, string> = {};

  for (const rawPair of text.split(",")) {
    const pair = rawPair.trim();
    if (pair === "") {
      continue;
    }

    const separatorIndex = pair.indexOf("=");
    const key = separatorIndex < 0 ? "" : pair.slice(0, separatorIndex).trim();
    if (key === "") {
      throw new VariableError(
        `変数の指定 "${pair}" は key=value の形式ではありません`,
      );
    }
    if (Object.hasOwn(values, key)) {
      throw new VariableError(`変数 "${key}" が重複して指定されています`);
    }

    values[key] = pair.slice(separatorIndex + 1).trim();
  }

  return values;
}
