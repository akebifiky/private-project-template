import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScaffoldError } from "../../src/models/app-error.js";
import { parseManifest } from "../../src/models/manifest/template-manifest.js";
import { inspectOutput } from "../../src/models/scaffold/output-inspector.js";
import { ScaffoldService } from "../../src/models/scaffold/scaffold-service.js";

const MANIFEST = parseManifest(
  {
    variables: [
      { name: "project-name", description: "d" },
      {
        name: "git-service",
        description: "d",
        choices: ["github", "gitlab"],
        default: "github",
      },
    ],
    ignore: ["skip/**"],
    files: [
      { paths: ["gh-only.txt"], when: { "git-service": "github" } },
      { paths: ["gl-only.txt"], when: { "git-service": "gitlab" } },
    ],
    forbiddenPatterns: [
      {
        pattern: "glab",
        when: { "git-service": "github" },
        reason: "glab が残っている",
      },
    ],
  },
  "test",
);

let workDir: string;
let templateDir: string;
let outputDir: string;

async function put(relative: string, content: string): Promise<void> {
  const path = join(templateDir, relative);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), "scaffold-test-"));
  templateDir = join(workDir, "template");
  outputDir = join(workDir, "output");
  await mkdir(templateDir);
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("ScaffoldService", () => {
  const values = { "project-name": "Example", "git-service": "github" };

  it(".eta は描画して拡張子を除き、それ以外はそのままコピーする", async () => {
    await put(
      "a/README.md.eta",
      "# <%= it.projectName %> & <%= it.git.cli %>\n",
    );
    await put("a/plain.md", "<%= it.projectName %>\n");
    await put("a/data.bin", "\u0000\u0001");

    const files = await new ScaffoldService().scaffold(
      templateDir,
      outputDir,
      MANIFEST,
      values,
    );

    expect(files).toEqual([
      { path: "a/data.bin", kind: "copied" },
      { path: "a/plain.md", kind: "copied" },
      { path: "a/README.md", kind: "rendered" },
    ]);
    expect(await readFile(join(outputDir, "a/README.md"), "utf8")).toBe(
      "# Example & gh\n",
    );
    expect(await readFile(join(outputDir, "a/plain.md"), "utf8")).toBe(
      "<%= it.projectName %>\n",
    );
  });

  it("マニフェストの規則に応じてファイルを出し分ける", async () => {
    await put("gh-only.txt", "gh");
    await put("gl-only.txt", "gl");
    await put("common.txt", "c");

    const files = await new ScaffoldService().scaffold(
      templateDir,
      outputDir,
      MANIFEST,
      { ...values, "git-service": "gitlab" },
    );

    expect(files.map((file) => file.path)).toEqual([
      "common.txt",
      "gl-only.txt",
    ]);
  });

  it("マニフェスト自身と ignore 対象は出力しない", async () => {
    await put("scaffold.manifest.json", "{}");
    await put("skip/a.txt", "x");
    await put("node_modules/b.txt", "x");
    await put("keep.txt", "x");

    const files = await new ScaffoldService().scaffold(
      templateDir,
      outputDir,
      MANIFEST,
      values,
    );

    expect(files.map((file) => file.path)).toEqual(["keep.txt"]);
  });

  it("シンボリックリンクとファイルの実行権限を再現する", async () => {
    await put("target.md", "t");
    await symlink("./target.md", join(templateDir, "link.md"));
    await put("run.sh.eta", "#!/bin/sh\n");
    const { chmod } = await import("node:fs/promises");
    await chmod(join(templateDir, "run.sh.eta"), 0o755);

    await new ScaffoldService().scaffold(
      templateDir,
      outputDir,
      MANIFEST,
      values,
    );

    expect((await lstat(join(outputDir, "link.md"))).isSymbolicLink()).toBe(
      true,
    );
    expect(await readlink(join(outputDir, "link.md"))).toBe("./target.md");
    expect((await stat(join(outputDir, "run.sh"))).mode & 0o777).toBe(0o755);
  });

  it("未定義の変数を参照するテンプレートは、何も出力せずに失敗する", async () => {
    await put("ok.txt", "ok");
    await put("bad.txt.eta", "<%= it.nothing %>");

    await expect(
      new ScaffoldService().scaffold(templateDir, outputDir, MANIFEST, values),
    ).rejects.toThrow(ScaffoldError);
    await expect(stat(outputDir)).rejects.toThrow();
  });

  it("出力パスが衝突した場合は例外とする", async () => {
    await put("a.md", "x");
    await put("a.md.eta", "y");

    await expect(
      new ScaffoldService().scaffold(templateDir, outputDir, MANIFEST, values),
    ).rejects.toThrow(/衝突/);
  });

  it("出力先が空でない場合は例外とする", async () => {
    await mkdir(outputDir);
    await writeFile(join(outputDir, "existing.txt"), "x");

    await expect(
      new ScaffoldService().scaffold(templateDir, outputDir, MANIFEST, values),
    ).rejects.toThrow(/空のディレクトリ/);
  });
});

describe("inspectOutput", () => {
  const values = { "project-name": "Example", "git-service": "github" };

  it("残留したタグ・禁止パターン・不正な JSON を検出する", async () => {
    await mkdir(outputDir);
    await writeFile(join(outputDir, "a.md"), "<% leftover %>");
    await writeFile(join(outputDir, "b.md"), "use glab");
    await writeFile(join(outputDir, "c.json"), "{");
    await writeFile(join(outputDir, "d.eta"), "x");
    await writeFile(join(outputDir, "ok.md"), "fine");

    const findings = await inspectOutput(outputDir, MANIFEST, values);

    expect(findings.map((finding) => finding.path).sort()).toEqual([
      "a.md",
      "b.md",
      "c.json",
      "d.eta",
    ]);
  });

  it("条件に合致しない禁止パターンは検出しない", async () => {
    await mkdir(outputDir);
    await writeFile(join(outputDir, "b.md"), "use glab");

    expect(
      await inspectOutput(outputDir, MANIFEST, {
        ...values,
        "git-service": "gitlab",
      }),
    ).toEqual([]);
  });
});
