import { input, select } from "@inquirer/prompts";
import type {
  VariableDefinition,
  VariableValues,
} from "../models/variables/variable-definition.js";
import { findUnspecified } from "../models/variables/variable-resolver.js";

/**
 * 指定されていないテンプレート変数を、対話形式で入力させて応答します。
 *
 * 選択肢のある変数は選択式、それ以外は入力式で問いかけます。
 *
 * @param definitions - 変数の定義
 * @param given - 指定済みの値
 * @returns 対話で入力された値 (指定済みの変数は含みません)
 */
export async function promptVariables(
  definitions: readonly VariableDefinition[],
  given: VariableValues,
): Promise<VariableValues> {
  const answers: Record<string, string> = {};

  for (const definition of findUnspecified(definitions, given)) {
    const message = `${definition.description} (${definition.name})`;

    answers[definition.name] = definition.choices
      ? await select({
          message,
          choices: definition.choices.map((value) => ({ value })),
          default: definition.default,
        })
      : await input({
          message,
          default: definition.default,
          required: true,
        });
  }

  return answers;
}
