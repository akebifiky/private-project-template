import type { VariableValues } from "./variable-definition.js";

/**
 * Git サービスごとの用語・コマンドの差異をまとめた派生変数
 */
export interface GitServiceTerms {
  /** サービス名の表記 */
  readonly serviceName: string;
  /** サービスを操作する CLI のコマンド名 */
  readonly cli: string;
  /** レビュー依頼の略称 (PR / MR) */
  readonly reviewUnit: string;
  /** レビュー依頼の正式名称 */
  readonly reviewUnitLong: string;
  /** CLI でレビュー依頼を操作するサブコマンド名 */
  readonly reviewSubcommand: string;
  /** CLI で CI の実行を操作するサブコマンド名 */
  readonly ciSubcommand: string;
  /** CI 機能の名称 */
  readonly ciName: string;
}

const GIT_SERVICE_TERMS: Readonly<Record<string, GitServiceTerms>> = {
  github: {
    serviceName: "GitHub",
    cli: "gh",
    reviewUnit: "PR",
    reviewUnitLong: "Pull Request",
    reviewSubcommand: "pr",
    ciSubcommand: "run",
    ciName: "GitHub Actions",
  },
  gitlab: {
    serviceName: "GitLab",
    cli: "glab",
    reviewUnit: "MR",
    reviewUnitLong: "Merge Request",
    reviewSubcommand: "mr",
    ciSubcommand: "ci",
    ciName: "GitLab CI/CD",
  },
};

/**
 * kebab-case の変数名を camelCase へ変換して応答します。
 *
 * @param name - 変換対象の変数名
 * @returns camelCase に変換した名前
 */
function toCamelCase(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

/**
 * プロジェクト名から、ディレクトリ名などに使える kebab-case の識別子を生成して応答します。
 *
 * @param projectName - プロジェクト名
 * @returns 識別子。英数字を含まない名前の場合は `project`
 */
export function toProjectSlug(projectName: string): string {
  const slug = projectName
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "project" : slug;
}

/**
 * 確定したテンプレート変数から、テンプレートへ渡す描画用の値を生成して応答します。
 *
 * すべての変数は camelCase のプロパティとして参照できます (`git-service` → `gitService`) 。
 * 加えて、次の派生変数を提供します。
 *
 * - `projectSlug` ... `projectName` から生成した kebab-case の識別子
 * - `git` ... `gitService` に応じた用語・コマンド ({@link GitServiceTerms})
 * - `useActions` ... `ciMode` が `actions` であるか
 *
 * 存在しないプロパティを参照すると、テンプレートの記述ミスを検知できるよう例外を送出します。
 *
 * @param values - 確定した変数の組
 * @returns テンプレートの `it` として渡す値
 */
export function buildRenderContext(
  values: VariableValues,
): Record<string, unknown> {
  const context: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(values)) {
    context[toCamelCase(name)] = value;
  }

  if (typeof context.projectName === "string") {
    context.projectSlug = toProjectSlug(context.projectName);
  }
  if (typeof context.gitService === "string") {
    const terms = GIT_SERVICE_TERMS[context.gitService];
    if (terms) {
      context.git = terms;
    }
  }
  if (typeof context.ciMode === "string") {
    context.useActions = context.ciMode === "actions";
  }

  return strictObject(context);
}

/**
 * 存在しないプロパティの参照で例外を送出するオブジェクトを生成して応答します。
 *
 * @param target - 元になるオブジェクト
 * @returns 厳密に参照を検証するオブジェクト
 */
function strictObject(
  target: Record<string, unknown>,
): Record<string, unknown> {
  return new Proxy(target, {
    get(object, property, receiver) {
      if (typeof property === "string" && !(property in object)) {
        throw new ReferenceError(
          `テンプレートが未定義の変数 "${property}" を参照しました`,
        );
      }
      return Reflect.get(object, property, receiver);
    },
  });
}
