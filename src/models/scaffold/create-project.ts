import { stat } from "node:fs/promises";
import { join } from "node:path";
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
import { type InspectionFinding, inspectOutput } from "./output-inspector.js";
import { type ScaffoldedFile, ScaffoldService } from "./scaffold-service.js";

/**
 * プロジェクト生成の指定
 */
export interface CreateProjectOptions {
  /** 使用するテンプレート名 (`templates/` 配下のディレクトリ名) */
  readonly templateName: string;
  /** 出力先ディレクトリ */
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
  /** テンプレートを格納するディレクトリ。省略した場合は `templates/` です。 */
  readonly templatesRoot?: string;
}

/**
 * プロジェクト生成の結果
 */
export interface CreateProjectResult {
  readonly values: VariableValues;
  readonly files: readonly ScaffoldedFile[];
  /** 生成物の検査で検出された問題 */
  readonly findings: readonly InspectionFinding[];
}

/**
 * テンプレートからプロジェクトを生成し、生成物を検査して応答します。
 *
 * @param options - 生成の指定
 * @returns 確定した変数・出力したファイル・検査結果
 * @throws {ScaffoldError} テンプレートが存在しない場合など
 */
export async function createProject(
  options: CreateProjectOptions,
): Promise<CreateProjectResult> {
  const templateDir = await resolveTemplateDir(
    options.templatesRoot ?? TEMPLATES_ROOT,
    options.templateName,
  );
  const manifest: TemplateManifest = await loadManifest(templateDir);

  const given = options.complete
    ? {
        ...options.given,
        ...(await options.complete(manifest.variables, options.given)),
      }
    : options.given;
  const values = resolveVariables(manifest.variables, given);

  const files = await new ScaffoldService().scaffold(
    templateDir,
    options.destination,
    manifest,
    values,
  );
  const findings = await inspectOutput(options.destination, manifest, values);

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
