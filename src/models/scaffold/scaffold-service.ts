import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  readlink,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join, posix } from "node:path";
import { minimatch } from "minimatch";
import { ScaffoldConflictError, ScaffoldError } from "../app-error.js";
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
 * 出力先に内容の異なる既存のファイルがあった場合の扱い
 *
 * - `error` ... 何も出力せずにエラーとする
 * - `skip` ... 既存のファイルを維持する
 * - `overwrite` ... 既存のファイルを上書きする
 */
export type ConflictPolicy = "error" | "skip" | "overwrite";

/** 指定できる {@link ConflictPolicy} の一覧 */
export const CONFLICT_POLICIES: readonly ConflictPolicy[] = [
  "error",
  "skip",
  "overwrite",
];

/**
 * ファイルの出力結果
 *
 * - `created` ... 新規に出力した
 * - `identical` ... 同じ内容のファイルが既にあるため、何もしなかった
 * - `overwritten` ... 既存のファイルを上書きした
 * - `skipped` ... 内容の異なる既存のファイルを維持した
 * - `conflict` ... 内容の異なる既存のファイルがある ( `--dry-run` で `error` の場合のみ)
 *
 * `dryRun` の場合は、実際には書き込まずに、書き込んだ場合の結果を示します。
 */
export type ScaffoldOutcome =
  | "created"
  | "identical"
  | "overwritten"
  | "skipped"
  | "conflict";

/**
 * 出力されたファイル
 */
export interface ScaffoldedFile {
  /** 出力先ディレクトリからの相対パス (`/` 区切り) */
  readonly path: string;
  readonly kind: ScaffoldedFileKind;
  readonly outcome: ScaffoldOutcome;
}

/**
 * 出力の指定
 */
export interface ScaffoldOptions {
  /** 内容の異なる既存のファイルがあった場合の扱い。省略した場合は `error` です。 */
  readonly onConflict?: ConflictPolicy;
  /** `true` の場合、書き込まずに結果のみを応答します。 */
  readonly dryRun?: boolean;
}

interface PlannedFile {
  readonly path: string;
  readonly kind: ScaffoldedFileKind;
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
   * 合致しないファイルは出力しません。出力先は既存のディレクトリでもよく、
   * 同じ内容のファイルは何もしません。内容の異なる既存のファイルは
   * {@link ScaffoldOptions.onConflict} に従って扱います。
   *
   * 描画と衝突の判定はすべて出力の前に行うため、テンプレートの誤りや衝突
   * ( `error` の場合) で失敗したときに、出力先へ中途半端な内容が残ることはありません。
   *
   * @param templateDir - テンプレートディレクトリ
   * @param destination - 出力先ディレクトリ
   * @param manifest - テンプレートのマニフェスト
   * @param values - 確定した変数の組
   * @param options - 衝突時の扱いなどの指定
   * @returns ファイルごとの出力結果 (パス順)
   * @throws {ScaffoldConflictError} 衝突があり、 `error` が指定されている場合 (`dryRun` を除く)
   * @throws {ScaffoldError} 出力パスが衝突した場合、描画に失敗した場合、既存のディレクトリと衝突した場合
   */
  async scaffold(
    templateDir: string,
    destination: string,
    manifest: TemplateManifest,
    values: VariableValues,
    options: ScaffoldOptions = {},
  ): Promise<ScaffoldedFile[]> {
    const onConflict = options.onConflict ?? "error";
    const plan = await this.plan(templateDir, manifest, values);

    const results: { file: PlannedFile; outcome: ScaffoldOutcome }[] = [];
    for (const file of plan) {
      const target = targetPath(destination, file.path);
      const existing = await lstat(target).catch(() => undefined);

      let outcome: ScaffoldOutcome;
      if (existing === undefined) {
        outcome = "created";
      } else if (await isIdentical(file, target)) {
        outcome = "identical";
      } else if (existing.isDirectory()) {
        throw new ScaffoldError(
          `${file.path} は出力先にディレクトリとして存在するため適用できません`,
        );
      } else if (onConflict === "overwrite") {
        outcome = "overwritten";
      } else if (onConflict === "skip") {
        outcome = "skipped";
      } else {
        outcome = "conflict";
      }
      results.push({ file, outcome });
    }

    const conflicts = results
      .filter(({ outcome }) => outcome === "conflict")
      .map(({ file }) => file.path);
    if (conflicts.length > 0 && !options.dryRun) {
      throw new ScaffoldConflictError(conflicts);
    }

    if (!options.dryRun) {
      for (const { file, outcome } of results) {
        if (outcome === "created" || outcome === "overwritten") {
          await write(file, targetPath(destination, file.path));
        }
      }
    }

    return results.map(({ file, outcome }) => ({
      path: file.path,
      kind: file.kind,
      outcome,
    }));
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

function targetPath(destination: string, path: string): string {
  return join(destination, ...path.split("/"));
}

/**
 * 出力予定のファイルと同じ内容のファイルが、出力先に既にあるか判定して応答します。
 */
async function isIdentical(
  file: PlannedFile,
  target: string,
): Promise<boolean> {
  const existing = await lstat(target);

  if (file.kind === "symlink") {
    return (
      existing.isSymbolicLink() && (await readlink(target)) === file.content
    );
  }
  if (!existing.isFile()) {
    return false;
  }

  const current = await readFile(target);
  const expected =
    file.kind === "rendered"
      ? Buffer.from(file.content as string, "utf8")
      : await readFile(file.sourcePath);
  return current.equals(expected);
}

/**
 * 出力予定のファイルを書き出します。既存のファイルやリンクは置き換えます。
 */
async function write(file: PlannedFile, target: string): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  await rm(target, { force: true });

  if (file.kind === "symlink") {
    await symlink(file.content as string, target);
  } else if (file.kind === "rendered") {
    await writeFile(target, file.content as string, { mode: file.mode });
  } else {
    await copyFile(file.sourcePath, target);
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
