import { stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { ScaffoldError } from "../app-error.js";
import {
  loadManifest,
  type TemplateManifest,
} from "../manifest/template-manifest.js";
import { TEMPLATES_ROOT } from "../paths.js";
import type {
  VariableDefinition,
  VariableValues,
} from "../variables/variable-definition.js";
import { resolveVariables } from "../variables/variable-resolver.js";
import { assertCleanWorkingTree } from "./git-safety.js";
import { type InspectionFinding, inspectOutput } from "./output-inspector.js";
import {
  type ConflictPolicy,
  type ScaffoldedFile,
  ScaffoldService,
} from "./scaffold-service.js";

/**
 * テンプレート適用の指定
 */
export interface ApplyTemplateOptions {
  /** 使用するテンプレート名 (`templates/` 配下のディレクトリ名) */
  readonly templateName: string;
  /** 出力先ディレクトリ。既存のリポジトリでもよい。 */
  readonly destination: string;
  /** 指定済みのテンプレート変数 */
  readonly given: VariableValues;
  /**
   * 未指定の変数を補う関数。省略した場合は、既定値のみで解決します。
   * 対話入力を行う場合に指定します。
   */
  readonly complete?: (
    definitions: readonly VariableDefinition[],
    given: VariableValues,
  ) => Promise<VariableValues>;
  /** 内容の異なる既存のファイルがあった場合の扱い。省略した場合は `error` です。 */
  readonly onConflict?: ConflictPolicy;
  /** `true` の場合、書き込まずに適用した場合の結果のみを応答します。 */
  readonly dryRun?: boolean;
  /** テンプレートを格納するディレクトリ。省略した場合は `templates/` です。 */
  readonly templatesRoot?: string;
}

/**
 * テンプレート適用の結果
 */
export interface ApplyTemplateResult {
  readonly values: VariableValues;
  /** ファイルごとの出力結果 */
  readonly files: readonly ScaffoldedFile[];
  /** 出力したファイルの検査で検出された問題。 `dryRun` の場合は常に空です。 */
  readonly findings: readonly InspectionFinding[];
}

/**
 * テンプレートを出力先へ適用し、出力したファイルを検査して応答します。
 *
 * `project-name` が未指定の場合は、出力先のディレクトリ名を既定値とします。
 *
 * @param options - 適用の指定
 * @returns 確定した変数・ファイルごとの出力結果・検査結果
 * @throws {ScaffoldError} テンプレートが存在しない場合、上書きを伴うのに出力先に未コミットの変更がある場合など
 * @throws {ScaffoldConflictError} 衝突があり、 `onConflict` が `error` の場合
 */
export async function applyTemplate(
  options: ApplyTemplateOptions,
): Promise<ApplyTemplateResult> {
  const templateDir = await resolveTemplateDir(
    options.templatesRoot ?? TEMPLATES_ROOT,
    options.templateName,
  );
  const manifest: TemplateManifest = await loadManifest(templateDir);
  const variables = manifest.variables.map(
    (variable): VariableDefinition =>
      variable.name === "project-name" && variable.default === undefined
        ? { ...variable, default: basename(options.destination) }
        : variable,
  );

  const given = options.complete
    ? {
        ...options.given,
        ...(await options.complete(variables, options.given)),
      }
    : options.given;
  const values = resolveVariables(variables, given);

  const onConflict = options.onConflict ?? "error";
  const dryRun = options.dryRun ?? false;
  if (onConflict === "overwrite" && !dryRun) {
    await assertCleanWorkingTree(options.destination);
  }

  const files = await new ScaffoldService().scaffold(
    templateDir,
    options.destination,
    manifest,
    values,
    { onConflict, dryRun },
  );
  const written = files
    .filter(({ outcome }) => outcome === "created" || outcome === "overwritten")
    .map(({ path }) => path);
  const findings = dryRun
    ? []
    : await inspectOutput(options.destination, written, manifest, values);

  return { values, files, findings };
}

async function resolveTemplateDir(
  templatesRoot: string,
  templateName: string,
): Promise<string> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(templateName)) {
    throw new ScaffoldError(`テンプレート名 "${templateName}" は不正です`);
  }

  const dir = join(templatesRoot, templateName);
  const isDirectory = await stat(dir)
    .then((status) => status.isDirectory())
    .catch(() => false);
  if (!isDirectory) {
    throw new ScaffoldError(
      `テンプレート "${templateName}" が見つかりません (${dir})`,
    );
  }
  return dir;
}
