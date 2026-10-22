import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify } from "node:util";
import { ScaffoldError } from "../app-error.js";

const execFileAsync = promisify(execFile);

/**
 * 出力先が Git リポジトリで、未コミットの変更がある場合に例外を送出します。
 *
 * 既存のファイルを上書きする前に、上書き内容を `git diff` や `git restore` で
 * 戻せる状態であることを保証するために用います。出力先が存在しない場合や、
 * Git リポジトリでない場合は何もしません。
 *
 * @param destination - 出力先ディレクトリ
 * @throws {ScaffoldError} 出力先に未コミットの変更 (未追跡のファイルを含む) がある場合
 */
export async function assertCleanWorkingTree(
  destination: string,
): Promise<void> {
  const exists = await stat(destination)
    .then((status) => status.isDirectory())
    .catch(() => false);
  if (!exists) {
    return;
  }

  let output: string;
  try {
    ({ stdout: output } = await execFileAsync(
      "git",
      ["-C", destination, "status", "--porcelain", "--", "."],
      { encoding: "utf8" },
    ));
  } catch {
    // git が利用できない、または Git リポジトリではない
    return;
  }

  if (output.trim() !== "") {
    throw new ScaffoldError(
      `出力先に未コミットの変更があるため、上書きは行えません。コミットまたは退避してから再実行してください:\n${output.trimEnd()}`,
    );
  }
}
