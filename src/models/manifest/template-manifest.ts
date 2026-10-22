import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ManifestError } from "../app-error.js";
import type {
  VariableDefinition,
  VariableValues,
} from "../variables/variable-definition.js";

/** マニフェストのファイル名。テンプレートディレクトリ直下に配置します。 */
export const MANIFEST_FILE_NAME = "scaffold.manifest.json";

/**
 * 変数の値に対する条件
 *
 * キーは変数名、値は許容する値 (複数指定した場合はいずれか) です。
 * 複数のキーを指定した場合は、すべてを満たす必要があります。
 */
export type Condition = Readonly<Record<string, string | readonly string[]>>;

/**
 * 条件を満たす場合にのみファイルを出力する規則
 */
export interface FileRule {
  /** 対象とするファイルのパス (出力先基準・glob) */
  readonly paths: readonly string[];
  /** 出力する条件 */
  readonly when: Condition;
}

/**
 * 出力に含まれてはならないパターンの規則
 */
export interface ForbiddenPattern {
  /** 検出する正規表現 */
  readonly pattern: string;
  /** 規則を適用する条件。省略した場合は常に適用します。 */
  readonly when?: Condition;
  /** 検出時に表示する理由 */
  readonly reason: string;
}

/**
 * テンプレートの変数宣言と出し分け規則を定義するマニフェスト
 */
export interface TemplateManifest {
  /** 宣言する変数 */
  readonly variables: readonly VariableDefinition[];
  /** 出力時に無視するファイルの glob */
  readonly ignore: readonly string[];
  /** コメントを含むなど、厳密な JSON として検査しないファイルの glob (出力先基準) */
  readonly jsonc: readonly string[];
  /** ファイルの出し分け規則 */
  readonly files: readonly FileRule[];
  /** 出力に含まれてはならないパターン */
  readonly forbiddenPatterns: readonly ForbiddenPattern[];
}

/**
 * 条件を満たすか判定して応答します。
 *
 * @param condition - 判定する条件
 * @param values - 確定した変数の組
 * @returns すべてのキーが許容値のいずれかと一致する場合は `true`
 */
export function matchesCondition(
  condition: Condition,
  values: VariableValues,
): boolean {
  return Object.entries(condition).every(([name, expected]) => {
    const actual = values[name];
    return typeof expected === "string"
      ? actual === expected
      : actual !== undefined && expected.includes(actual);
  });
}

/**
 * テンプレートディレクトリのマニフェストを読み込んで応答します。
 *
 * @param templateDir - テンプレートディレクトリ
 * @returns 検証済みのマニフェスト
 * @throws {ManifestError} ファイルが存在しない、または内容が不正な場合
 */
export async function loadManifest(
  templateDir: string,
): Promise<TemplateManifest> {
  const path = join(templateDir, MANIFEST_FILE_NAME);

  let json: unknown;
  try {
    json = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new ManifestError(`マニフェスト ${path} を読み込めませんでした`, {
      cause: error,
    });
  }

  return parseManifest(json, path);
}

/**
 * マニフェストの JSON を検証して応答します。
 *
 * @param json - 解析済みの JSON
 * @param source - エラーメッセージに表示するマニフェストの場所
 * @returns 検証済みのマニフェスト
 * @throws {ManifestError} 内容が不正な場合
 */
export function parseManifest(json: unknown, source: string): TemplateManifest {
  const root = asRecord(json, source);

  const variables = asArray(root.variables, `${source}: variables`).map(
    (item, index) => parseVariable(item, `${source}: variables[${index}]`),
  );
  const names = new Set<string>();
  for (const variable of variables) {
    if (names.has(variable.name)) {
      throw new ManifestError(
        `${source}: 変数 "${variable.name}" が重複して宣言されています`,
      );
    }
    names.add(variable.name);
  }

  const ignore = asOptionalStrings(root.ignore, `${source}: ignore`);
  const jsonc = asOptionalStrings(root.jsonc, `${source}: jsonc`);
  const files = asOptionalArray(root.files, `${source}: files`).map(
    (item, index): FileRule => {
      const where = `${source}: files[${index}]`;
      const record = asRecord(item, where);
      return {
        paths: asStrings(record.paths, `${where}.paths`),
        when: parseCondition(record.when, `${where}.when`, names),
      };
    },
  );
  const forbiddenPatterns = asOptionalArray(
    root.forbiddenPatterns,
    `${source}: forbiddenPatterns`,
  ).map((item, index): ForbiddenPattern => {
    const where = `${source}: forbiddenPatterns[${index}]`;
    const record = asRecord(item, where);
    const pattern = asString(record.pattern, `${where}.pattern`);
    try {
      new RegExp(pattern);
    } catch (error) {
      throw new ManifestError(`${where}.pattern が正規表現として不正です`, {
        cause: error,
      });
    }
    return {
      pattern,
      reason: asString(record.reason, `${where}.reason`),
      ...(record.when === undefined
        ? {}
        : { when: parseCondition(record.when, `${where}.when`, names) }),
    };
  });

  return { variables, ignore, jsonc, files, forbiddenPatterns };
}

function parseVariable(item: unknown, where: string): VariableDefinition {
  const record = asRecord(item, where);
  const name = asString(record.name, `${where}.name`);
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
    throw new ManifestError(
      `${where}.name "${name}" は kebab-case ではありません`,
    );
  }
  const choices =
    record.choices === undefined
      ? undefined
      : asStrings(record.choices, `${where}.choices`);
  const defaultValue =
    record.default === undefined
      ? undefined
      : asString(record.default, `${where}.default`);
  if (
    defaultValue !== undefined &&
    choices !== undefined &&
    !choices.includes(defaultValue)
  ) {
    throw new ManifestError(`${where}.default が choices に含まれていません`);
  }

  return {
    name,
    description: asString(record.description, `${where}.description`),
    ...(choices === undefined ? {} : { choices }),
    ...(defaultValue === undefined ? {} : { default: defaultValue }),
  };
}

function parseCondition(
  value: unknown,
  where: string,
  variableNames: ReadonlySet<string>,
): Condition {
  const record = asRecord(value, where);
  const condition: Record<string, string | readonly string[]> = {};
  for (const [name, expected] of Object.entries(record)) {
    if (!variableNames.has(name)) {
      throw new ManifestError(
        `${where}: 未宣言の変数 "${name}" を参照しています`,
      );
    }
    condition[name] =
      typeof expected === "string"
        ? expected
        : asStrings(expected, `${where}.${name}`);
  }
  return condition;
}

function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ManifestError(`${where} はオブジェクトである必要があります`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ManifestError(`${where} は配列である必要があります`);
  }
  return value;
}

function asOptionalArray(value: unknown, where: string): unknown[] {
  return value === undefined ? [] : asArray(value, where);
}

function asString(value: unknown, where: string): string {
  if (typeof value !== "string" || value === "") {
    throw new ManifestError(`${where} は空でない文字列である必要があります`);
  }
  return value;
}

function asStrings(value: unknown, where: string): string[] {
  const items = asArray(value, where);
  if (items.length === 0) {
    throw new ManifestError(`${where} は 1 件以上の要素が必要です`);
  }
  return items.map((item, index) => asString(item, `${where}[${index}]`));
}

function asOptionalStrings(value: unknown, where: string): string[] {
  return value === undefined
    ? []
    : asArray(value, where).map((item, index) =>
        asString(item, `${where}[${index}]`),
      );
}
