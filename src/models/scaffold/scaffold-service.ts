import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  readlink,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join, posix } from "node:path";
import { minimatch } from "minimatch";
import { ScaffoldError } from "../app-error.js";
import {
  MANIFEST_FILE_NAME,
  matchesCondition,
  type TemplateManifest,
} from "../manifest/template-manifest.js";
import { buildRenderContext } from "../variables/render-context.js";
import type { VariableValues } from "../variables/variable-definition.js";
import { TEMPLATE_EXTENSION, TemplateRenderer } from "./template-renderer.js";

/** 常に出力対象から除外するファイルの glob */
const ALWAYS_IGNORED = ["**/node_modules/**", "**/.git/**"];

const MATCH_OPTIONS = { dot: true } as const;

/**
 * 出力されたファイルの種別
 *
 * - `rendered` ... テンプレートエンジンで描画して出力したファイル
 * - `copied` ... そのままコピーしたファイル
 * - `symlink` ... シンボリックリンクとして再現したファイル
 */
export type ScaffoldedFileKind = "rendered" | "copied" | "symlink";

/**
 * 出力されたファイル
 */
export interface ScaffoldedFile {
  /** 出力先ディレクトリからの相対パス (`/` 区切り) */
  readonly path: string;
  readonly kind: ScaffoldedFileKind;
}

interface PlannedFile extends ScaffoldedFile {
  readonly sourcePath: string;
  readonly mode: number;
  /** `rendered` の描画結果、 `symlink` のリンク先 */
  readonly content?: string;
}

/**
 * テンプレートディレクトリの内容から、プロジェクトの雛形を生成するサービス
 */
export class ScaffoldService {
  private readonly renderer = new TemplateRenderer();

  /**
   * テンプレートディレクトリの内容を、出力先へ展開して応答します。
   *
   * `.eta` 拡張子のファイルは描画したうえで拡張子を除いたファイル名で出力し、
   * それ以外のファイルはそのままコピーします。マニフェストの出し分け規則に
   * 合致しないファイルは出力しません。描画はすべて出力の前に行うため、
   * テンプレートに誤りがある場合に出力先へ中途半端な内容が残ることはありません。
   *
   * @param templateDir - テンプレートディレクトリ
   * @param destination - 出力先ディレクトリ。存在しない、または空である必要があります。
   * @param manifest - テンプレートのマニフェスト
   * @param values - 確定した変数の組
   * @returns 出力したファイルの一覧 (パス順)
   * @throws {ScaffoldError} 出力先が空でない場合、出力パスが衝突した場合、描画に失敗した場合
   */
  async scaffold(
    templateDir: string,
    destination: string,
    manifest: TemplateManifest,
    values: VariableValues,
  ): Promise<ScaffoldedFile[]> {
    await this.assertWritable(destination);

    const plan = await this.plan(templateDir, manifest, values);

    for (const file of plan) {
      const target = join(destination, ...file.path.split("/"));
      await mkdir(dirname(target), { recursive: true });

      if (file.kind === "symlink") {
        await symlink(file.content as string, target);
      } else if (file.kind === "rendered") {
        await writeFile(target, file.content as string, { mode: file.mode });
      } else {
        await copyFile(file.sourcePath, target);
      }
    }

    return plan.map(({ path, kind }) => ({ path, kind }));
  }

  private async assertWritable(destination: string): Promise<void> {
    try {
      const entries = await readdir(destination);
      if (entries.length > 0) {
        throw new ScaffoldError(
          `出力先 ${destination} は空のディレクトリではありません`,
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  private async plan(
    templateDir: string,
    manifest: TemplateManifest,
    values: VariableValues,
  ): Promise<PlannedFile[]> {
    const context = buildRenderContext(values);
    const ignored = [...ALWAYS_IGNORED, ...manifest.ignore];
    const planned = new Map<string, PlannedFile>();

    for (const sourceRelative of await listEntries(templateDir)) {
      if (
        sourceRelative === MANIFEST_FILE_NAME ||
        ignored.some((glob) => minimatch(sourceRelative, glob, MATCH_OPTIONS))
      ) {
        continue;
      }

      const isTemplate = sourceRelative.endsWith(TEMPLATE_EXTENSION);
      const outputPath = isTemplate
        ? sourceRelative.slice(0, -TEMPLATE_EXTENSION.length)
        : sourceRelative;
      if (!isIncluded(outputPath, manifest, values)) {
        continue;
      }
      if (planned.has(outputPath)) {
        throw new ScaffoldError(
          `出力パス ${outputPath} が複数のテンプレートファイルで衝突しています`,
        );
      }

      const sourcePath = join(templateDir, ...sourceRelative.split("/"));
      const status = await lstat(sourcePath);
      if (status.isSymbolicLink()) {
        planned.set(outputPath, {
          path: outputPath,
          kind: "symlink",
          sourcePath,
          mode: status.mode,
          content: await readlink(sourcePath),
        });
      } else if (isTemplate) {
        planned.set(outputPath, {
          path: outputPath,
          kind: "rendered",
          sourcePath,
          mode: (await stat(sourcePath)).mode & 0o777,
          content: this.renderer.render(
            await readFile(sourcePath, "utf8"),
            context,
            sourceRelative,
          ),
        });
      } else {
        planned.set(outputPath, {
          path: outputPath,
          kind: "copied",
          sourcePath,
          mode: status.mode,
        });
      }
    }

    return [...planned.values()].sort((a, b) => a.path.localeCompare(b.path));
  }
}

/**
 * 出し分け規則に照らして、ファイルを出力するか判定して応答します。
 *
 * どの規則にも合致しないファイルは常に出力します。合致する規則がある場合は、
 * そのいずれかの条件を満たすときのみ出力します。
 */
function isIncluded(
  outputPath: string,
  manifest: TemplateManifest,
  values: VariableValues,
): boolean {
  const matched = manifest.files.filter((rule) =>
    rule.paths.some((glob) => minimatch(outputPath, glob, MATCH_OPTIONS)),
  );
  return (
    matched.length === 0 ||
    matched.some((rule) => matchesCondition(rule.when, values))
  );
}

/**
 * ディレクトリ配下のファイルとシンボリックリンクを、相対パス (`/` 区切り) で列挙して応答します。
 * ディレクトリへのシンボリックリンクは辿りません。
 */
async function listEntries(root: string, relative = ""): Promise<string[]> {
  const entries = await readdir(join(root, relative), { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const path = posix.join(relative, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listEntries(root, path)));
    } else {
      results.push(path);
    }
  }

  return results;
}
