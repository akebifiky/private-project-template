import { Command } from "commander";
import { createAdrSearchCommand } from "./commands/adr/search.js";
import { createCommonFormatLintCommand } from "./commands/common-format/lint.js";
import { createLintCommand } from "./commands/lint.js";
import { createTcSearchCommand } from "./commands/tc/search.js";

/**
 * 開発ドキュメント用 CLI のルートプログラムを生成して応答します。
 *
 * `adr` / `tc` / `lint` のサブコマンドを登録します。今後コマンドを追加する
 * 場合は、対応するコマンド生成関数を作成した上でここに登録してください。
 *
 * @returns 生成された Commander プログラム。
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name("dev-docs-cli")
    .description("開発ドキュメント (ADR/TC) の検索・検証用 CLI");

  const adrCommand = program.command("adr").description("ADR 関連のコマンド");
  adrCommand.addCommand(createAdrSearchCommand());

  const tcCommand = program.command("tc").description("TC 関連のコマンド");
  tcCommand.addCommand(createTcSearchCommand());

  const commonFormatCommand = program
    .command("common-format")
    .description("Markdown の共通フォーマット関連のコマンド");
  commonFormatCommand.addCommand(createCommonFormatLintCommand());

  program.addCommand(createLintCommand());

  return program;
}

createProgram().parse(process.argv);
