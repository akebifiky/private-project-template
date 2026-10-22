import { VariableError } from "../app-error.js";
import type {
  VariableDefinition,
  VariableValues,
} from "./variable-definition.js";

/**
 * 指定されていない変数の定義を応答します。
 *
 * 対話入力で追加の指定を求める対象を判定するために用います。
 *
 * @param definitions - 変数の定義
 * @param given - 指定済みの値
 * @returns 指定値がない変数の定義 (既定値の有無は問いません)
 */
export function findUnspecified(
  definitions: readonly VariableDefinition[],
  given: VariableValues,
): VariableDefinition[] {
  return definitions.filter(
    (definition) => !Object.hasOwn(given, definition.name),
  );
}

/**
 * 指定値に既定値を補い、検証したうえで確定した変数の組を応答します。
 *
 * @param definitions - 変数の定義
 * @param given - 指定済みの値
 * @returns すべての変数が確定した値の組
 * @throws {VariableError} 未定義の変数が指定された場合、値が空・選択肢外の場合、必須の変数が未指定の場合
 */
export function resolveVariables(
  definitions: readonly VariableDefinition[],
  given: VariableValues,
): VariableValues {
  const known = new Set(definitions.map((definition) => definition.name));
  const unknown = Object.keys(given).filter((name) => !known.has(name));
  if (unknown.length > 0) {
    throw new VariableError(
      `未定義の変数が指定されています: ${unknown.join(", ")} (利用可能: ${[...known].join(", ")})`,
    );
  }

  const resolved: Record<string, string> = {};
  for (const definition of definitions) {
    const value = Object.hasOwn(given, definition.name)
      ? given[definition.name]
      : definition.default;

    if (value === undefined) {
      throw new VariableError(`変数 "${definition.name}" が指定されていません`);
    }
    if (value === "") {
      throw new VariableError(`変数 "${definition.name}" が空です`);
    }
    if (definition.choices && !definition.choices.includes(value)) {
      throw new VariableError(
        `変数 "${definition.name}" の値 "${value}" は選択肢 (${definition.choices.join(", ")}) に含まれません`,
      );
    }

    resolved[definition.name] = value;
  }

  return resolved;
}
