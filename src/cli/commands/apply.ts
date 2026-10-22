import { basename, resolve } from "node:path";
import { Command, Option } from "commander";
import { applyTemplate } from "../../models/scaffold/apply-template.js";
import {
  CONFLICT_POLICIES,
  type ConflictPolicy,
  type ScaffoldOutcome,
} from "../../models/scaffold/scaffold-service.js";
import { parseVariables } from "../../models/variables/variable-parser.js";
import { promptVariables } from "../prompts.js";

interface ApplyOptions {
  template: string;
  vars?: string;
  interactive: boolean;
  onConflict: ConflictPolicy;
  dryRun: boolean;
}

const OUTCOME_LABELS: Record<ScaffoldOutcome, string> = {
  created: "作成",
  identical: "同一",
  overwritten: "上書き",
  skipped: "維持",
  conflict: "衝突",
};

/**
 * テンプレートをディレクトリへ適用するコマンド (`apply`) を生成して応答します。
 *
 * 新規のディレクトリだけでなく、作成済みのリポジトリにも適用できます。
 * 標準入力が端末であり、かつ `--no-interactive` が指定されていない場合は、
 * `--vars` で指定されなかった変数を対話形式で入力させます。
 * それ以外の場合は、既定値のない変数が未指定であればエラーとします。
 * `project-name` の既定値は、出力先のディレクトリ名です。
 *
 * @returns 生成された Commander コマンド。
 */
export function createApplyCommand(): Command {
  return new Command("apply")
    .description(
      "テンプレートをディレクトリ (既存のリポジトリを含む) へ適用します",
    )
    .argument("[destination]", "適用先のディレクトリ", ".")
    .option("-t, --template <name>", "使用するテンプレート名", "default")
    .option(
      "--vars <pairs>",
      "テンプレート変数 (例: 'project-name=Example, git-service=github')",
    )
    .option("--no-interactive", "対話入力を行わない")
    .addOption(
      new Option(
        "--on-conflict <policy>",
        "内容の異なる既存のファイルがある場合の扱い (error: 何も適用しない / skip: 既存を維持 / overwrite: 上書き)",
      )
        .choices(CONFLICT_POLICIES)
        .default("error"),
    )
    .option("--dry-run", "書き込まず、適用した場合の結果のみを表示する", false)
    .action(async (destination: string, options: ApplyOptions) => {
      try {
        const interactive = options.interactive && process.stdin.isTTY === true;
        const result = await applyTemplate({
          templateName: options.template,
          destination: resolve(destination),
          given: parseVariables(options.vars ?? ""),
          onConflict: options.onConflict,
          dryRun: options.dryRun,
          ...(interactive ? { complete: promptVariables } : {}),
        });

        const counts = new Map<ScaffoldOutcome, number>();
        for (const file of result.files) {
          counts.set(file.outcome, (counts.get(file.outcome) ?? 0) + 1);
          if (options.dryRun || file.outcome !== "created") {
            console.log(`  [${OUTCOME_LABELS[file.outcome]}] ${file.path}`);
          }
        }

        const summary = [...counts]
          .map(([outcome, count]) => `${OUTCOME_LABELS[outcome]} ${count} 件`)
          .join("、");
        console.log(
          `${options.dryRun ? "[dry-run] " : ""}${basename(resolve(destination))} へのテンプレートの適用結果: ${summary}`,
        );
        for (const [name, value] of Object.entries(result.values)) {
          console.log(`  ${name}: ${value}`);
        }

        if (result.findings.length > 0) {
          console.error("出力したファイルの検査で問題を検出しました:");
          for (const finding of result.findings) {
            console.error(`  ${finding.path}: ${finding.message}`);
          }
          process.exitCode = 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`テンプレートの適用に失敗しました: ${message}`);
        process.exitCode = 1;
      }
    });
}
