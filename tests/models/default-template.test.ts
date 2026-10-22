import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createProject } from "../../src/models/scaffold/create-project.js";

const COMBINATIONS = [
  { gitService: "github", ciMode: "local" },
  { gitService: "github", ciMode: "actions" },
  { gitService: "gitlab", ciMode: "local" },
  { gitService: "gitlab", ciMode: "actions" },
] as const;

/** 描画結果をスナップショットで固定するファイル (テンプレートの変更が出力へ与える影響を確認する) */
const SNAPSHOT_PATHS = [
  "README.md",
  "CLAUDE.md",
  ".claude/settings.json",
  "tools/ci/README.md",
  "docs/dev-docs/content/project-rules/workflow.md",
  "docs/dev-docs/content/requirements/index.md",
  ".github/workflows/check.yml",
  ".gitlab-ci.yml",
];

let workDir: string;

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), "default-template-test-"));
});

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe.each(COMBINATIONS)(
  "templates/default ($gitService, $ciMode)",
  ({ gitService, ciMode }) => {
    it("検査で問題が検出されず、出力が期待どおりである", async () => {
      const destination = join(workDir, `${gitService}-${ciMode}`);

      const result = await createProject({
        templateName: "default",
        destination,
        given: {
          "project-name": "Example",
          "git-service": gitService,
          "ci-mode": ciMode,
        },
      });

      expect(result.findings).toEqual([]);

      const paths = result.files.map((file) => file.path);
      expect(paths.filter((path) => path.endsWith(".eta"))).toEqual([]);
      expect(paths.includes(".github/workflows/check.yml")).toBe(
        gitService === "github" && ciMode === "actions",
      );
      expect(paths.includes(".gitlab-ci.yml")).toBe(
        gitService === "gitlab" && ciMode === "actions",
      );
      expect(paths).toMatchSnapshot("files");

      for (const path of SNAPSHOT_PATHS.filter((p) => paths.includes(p))) {
        expect(await readFile(join(destination, path), "utf8")).toMatchSnapshot(
          path,
        );
      }
    });
  },
);
