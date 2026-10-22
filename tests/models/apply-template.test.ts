import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyTemplate } from "../../src/models/scaffold/apply-template.js";

let workDir: string;
let templatesRoot: string;
let destination: string;

const MANIFEST = {
  variables: [{ name: "project-name", description: "d" }],
};

function git(...args: string[]): void {
  execFileSync("git", ["-C", destination, ...args], { stdio: "ignore" });
}

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "apply-template-test-"));
  templatesRoot = join(workDir, "templates");
  destination = join(workDir, "my-repo");
  await mkdir(join(templatesRoot, "t"), { recursive: true });
  await writeFile(
    join(templatesRoot, "t", "scaffold.manifest.json"),
    JSON.stringify(MANIFEST),
  );
  await writeFile(
    join(templatesRoot, "t", "README.md.eta"),
    "# <%= it.projectName %>\n",
  );
  await mkdir(destination);
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

function apply(
  options: Parameters<typeof applyTemplate>[0] extends infer T
    ? Partial<T>
    : never,
) {
  return applyTemplate({
    templateName: "t",
    destination,
    given: {},
    templatesRoot,
    ...options,
  });
}

describe("applyTemplate", () => {
  it("project-name の既定値として出力先のディレクトリ名を用いる", async () => {
    const result = await apply({});

    expect(result.values["project-name"]).toBe("my-repo");
    expect(await readFile(join(destination, "README.md"), "utf8")).toBe(
      "# my-repo\n",
    );
  });

  it("指定された project-name を優先する", async () => {
    await apply({ given: { "project-name": "Given" } });

    expect(await readFile(join(destination, "README.md"), "utf8")).toBe(
      "# Given\n",
    );
  });

  it("適用先に元からあるファイルは検査の対象にしない", async () => {
    await writeFile(join(destination, "mine.md"), "<% mine %>");

    const result = await apply({});

    expect(result.findings).toEqual([]);
  });

  describe("overwrite", () => {
    beforeEach(async () => {
      git("init", "-q");
      git("config", "user.email", "test@example.com");
      git("config", "user.name", "test");
      await writeFile(join(destination, "README.md"), "old\n");
      git("add", ".");
      git("commit", "-q", "-m", "init");
    });

    it("作業ツリーがクリーンな場合は上書きする", async () => {
      await apply({ onConflict: "overwrite" });

      expect(await readFile(join(destination, "README.md"), "utf8")).toBe(
        "# my-repo\n",
      );
    });

    it("未コミットの変更がある場合は拒否し、何も変更しない", async () => {
      await writeFile(join(destination, "wip.md"), "wip");

      await expect(apply({ onConflict: "overwrite" })).rejects.toThrow(
        /未コミットの変更/,
      );
      expect(await readFile(join(destination, "README.md"), "utf8")).toBe(
        "old\n",
      );
    });

    it("dryRun では未コミットの変更があっても拒否しない", async () => {
      await writeFile(join(destination, "wip.md"), "wip");

      const result = await apply({ onConflict: "overwrite", dryRun: true });

      expect(result.files[0]?.outcome).toBe("overwritten");
      expect(await readFile(join(destination, "README.md"), "utf8")).toBe(
        "old\n",
      );
    });
  });
});
