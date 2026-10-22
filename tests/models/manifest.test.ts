import { describe, expect, it } from "vitest";
import { ManifestError } from "../../src/models/app-error.js";
import {
  matchesCondition,
  parseManifest,
} from "../../src/models/manifest/template-manifest.js";

const VALID = {
  variables: [
    { name: "git-service", description: "d", choices: ["github", "gitlab"] },
  ],
  files: [{ paths: [".github/**"], when: { "git-service": "github" } }],
};

describe("parseManifest", () => {
  it("正しいマニフェストを解析し、省略可能な項目を補う", () => {
    const manifest = parseManifest(VALID, "test");
    expect(manifest.ignore).toEqual([]);
    expect(manifest.forbiddenPatterns).toEqual([]);
    expect(manifest.files).toHaveLength(1);
  });

  it("未宣言の変数を条件で参照した場合は例外とする", () => {
    expect(() =>
      parseManifest(
        { ...VALID, files: [{ paths: ["a"], when: { nothing: "x" } }] },
        "test",
      ),
    ).toThrow(ManifestError);
  });

  it("変数名が kebab-case でない場合は例外とする", () => {
    expect(() =>
      parseManifest(
        { variables: [{ name: "gitService", description: "d" }] },
        "test",
      ),
    ).toThrow(/kebab-case/);
  });

  it("既定値が選択肢に含まれない場合は例外とする", () => {
    expect(() =>
      parseManifest(
        {
          variables: [
            { name: "a", description: "d", choices: ["x"], default: "y" },
          ],
        },
        "test",
      ),
    ).toThrow(/choices/);
  });

  it("不正な正規表現は例外とする", () => {
    expect(() =>
      parseManifest(
        { ...VALID, forbiddenPatterns: [{ pattern: "(", reason: "r" }] },
        "test",
      ),
    ).toThrow(ManifestError);
  });
});

describe("matchesCondition", () => {
  it("すべてのキーが一致した場合のみ真とする", () => {
    const values = { a: "1", b: "2" };
    expect(matchesCondition({ a: "1", b: "2" }, values)).toBe(true);
    expect(matchesCondition({ a: "1", b: "3" }, values)).toBe(false);
  });

  it("配列はいずれかとの一致で真とする", () => {
    expect(matchesCondition({ a: ["1", "9"] }, { a: "1" })).toBe(true);
    expect(matchesCondition({ a: ["8", "9"] }, { a: "1" })).toBe(false);
  });
});
