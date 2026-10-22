#!/usr/bin/env node
import { Command } from "commander";
import { createCreateCommand } from "./commands/create.js";

/**
 * スキャフォールディング CLI のルートプログラムを生成して応答します。
 *
 * 今後コマンドを追加する場合は、対応するコマンド生成関数を作成した上でここに登録してください。
 *
 * @returns 生成された Commander プログラム。
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name("project-template")
    .description(
      "テンプレートからプロジェクトをスキャフォールディングする CLI",
    );

  program.addCommand(createCreateCommand());

  return program;
}

await createProgram().parseAsync(process.argv);
