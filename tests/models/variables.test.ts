import { describe, expect, it } from "vitest";
import { VariableError } from "../../src/models/app-error.js";
import {
  buildRenderContext,
  toProjectSlug,
} from "../../src/models/variables/render-context.js";
import type { VariableDefinition } from "../../src/models/variables/variable-definition.js";
import { parseVariables } from "../../src/models/variables/variable-parser.js";
import {
  findUnspecified,
  resolveVariables,
} from "../../src/models/variables/variable-resolver.js";

const DEFINITIONS: VariableDefinition[] = [
  { name: "project-name", description: "名前" },
  {
    name: "git-service",
    description: "サービス",
    choices: ["github", "gitlab"],
    default: "github",
  },
];

describe("parseVariables", () => {
  it("カンマ区切りの key=value を解析する", () => {
    expect(
      parseVariables("project-name=Example, git-service = gitlab"),
    ).toEqual({ "project-name": "Example", "git-service": "gitlab" });
  });

  it("値に = を含められる", () => {
    expect(parseVariables("a=b=c")).toEqual({ a: "b=c" });
  });

  it("空文字列は空の組になる", () => {
    expect(parseVariables("")).toEqual({});
  });

  it("形式が不正な場合は例外とする", () => {
    expect(() => parseVariables("foo")).toThrow(VariableError);
    expect(() => parseVariables("=bar")).toThrow(VariableError);
  });

  it("キーが重複した場合は例外とする", () => {
    expect(() => parseVariables("a=1,a=2")).toThrow(VariableError);
  });
});

describe("resolveVariables", () => {
  it("既定値を補う", () => {
    expect(resolveVariables(DEFINITIONS, { "project-name": "X" })).toEqual({
      "project-name": "X",
      "git-service": "github",
    });
  });

  it("必須の変数が未指定の場合は例外とする", () => {
    expect(() => resolveVariables(DEFINITIONS, {})).toThrow(/project-name/);
  });

  it("選択肢にない値は例外とする", () => {
    expect(() =>
      resolveVariables(DEFINITIONS, {
        "project-name": "X",
        "git-service": "bitbucket",
      }),
    ).toThrow(/選択肢/);
  });

  it("未定義の変数が指定された場合は例外とする", () => {
    expect(() =>
      resolveVariables(DEFINITIONS, { "project-name": "X", unknown: "1" }),
    ).toThrow(/unknown/);
  });

  it("空の値は例外とする", () => {
    expect(() => resolveVariables(DEFINITIONS, { "project-name": "" })).toThrow(
      VariableError,
    );
  });
});

describe("findUnspecified", () => {
  it("指定されていない変数を既定値の有無によらず返す", () => {
    expect(
      findUnspecified(DEFINITIONS, { "project-name": "X" }).map((d) => d.name),
    ).toEqual(["git-service"]);
  });
});

describe("buildRenderContext", () => {
  it("camelCase の変数と派生変数を提供する", () => {
    const context = buildRenderContext({
      "project-name": "My App",
      "git-service": "gitlab",
      "ci-mode": "actions",
    });

    expect(context.projectName).toBe("My App");
    expect(context.projectSlug).toBe("my-app");
    expect(context.useActions).toBe(true);
    expect(context.git).toMatchObject({ cli: "glab", reviewUnit: "MR" });
  });

  it("存在しない変数の参照は例外とする", () => {
    const context = buildRenderContext({ "project-name": "X" });
    expect(() => context.missing).toThrow(ReferenceError);
  });
});

describe("toProjectSlug", () => {
  it("英数字以外を区切りとした kebab-case に変換する", () => {
    expect(toProjectSlug("  Hello, World! 2 ")).toBe("hello-world-2");
  });

  it("英数字を含まない名前は既定の識別子にする", () => {
    expect(toProjectSlug("日本語")).toBe("project");
  });
});
