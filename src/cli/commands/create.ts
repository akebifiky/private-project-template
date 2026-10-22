import { resolve } from "node:path";
import { Command } from "commander";
import { createProject } from "../../models/scaffold/create-project.js";
import { parseVariables } from "../../models/variables/variable-parser.js";
import { promptVariables } from "../prompts.js";

interface CreateOptions {
  template: string;
  vars?: string;
  interactive: boolean;
}

/**
 * テンプレートからプロジェクトを生成するコマンド (`create`) を生成して応答します。
 *
 * 標準入力が端末であり、かつ `--no-interactive` が指定されていない場合は、
 * `--vars` で指定されなかった変数を対話形式で入力させます。
 * それ以外の場合は、既定値のない変数が未指定であればエラーとします。
 *
 * @returns 生成された Commander コマンド。
 */
export function createCreateCommand(): Command {
  return new Command("create")
    .description("テンプレートからプロジェクトを生成します")
    .argument("<destination>", "出力先ディレクトリ (存在しない、または空)")
    .option("-t, --template <name>", "使用するテンプレート名", "default")
    .option(
      "--vars <pairs>",
      "テンプレート変数 (例: 'project-name=Example, git-service=github')",
    )
    .option("--no-interactive", "対話入力を行わない")
    .action(async (destination: string, options: CreateOptions) => {
      try {
        const interactive = options.interactive && process.stdin.isTTY === true;
        const result = await createProject({
          templateName: options.template,
          destination: resolve(destination),
          given: parseVariables(options.vars ?? ""),
          ...(interactive ? { complete: promptVariables } : {}),
        });

        console.log(
          `${result.files.length} 件のファイルを ${destination} に生成しました。`,
        );
        for (const [name, value] of Object.entries(result.values)) {
          console.log(`  ${name}: ${value}`);
        }

        if (result.findings.length > 0) {
          console.error("生成物の検査で問題を検出しました:");
          for (const finding of result.findings) {
            console.error(`  ${finding.path}: ${finding.message}`);
          }
          process.exitCode = 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`プロジェクトの生成に失敗しました: ${message}`);
        process.exitCode = 1;
      }
    });
}
