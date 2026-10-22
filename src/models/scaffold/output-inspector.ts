import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { minimatch } from "minimatch";
import {
  matchesCondition,
  type TemplateManifest,
} from "../manifest/template-manifest.js";
import type { VariableValues } from "../variables/variable-definition.js";
import { TEMPLATE_EXTENSION } from "./template-renderer.js";

/** 描画されずに残ったテンプレートタグの検出パターン */
const UNRENDERED_TAG = /<%/;

/**
 * 生成物の検査で検出された問題
 */
export interface InspectionFinding {
  /** 出力先ディレクトリからの相対パス */
  readonly path: string;
  /** 問題の内容 */
  readonly message: string;
}

/**
 * 生成された出力を検査し、問題を応答します。
 *
 * 次を検出します。
 *
 * - `.eta` 拡張子のファイルが残っている
 * - 描画されなかったテンプレートタグ (`<%`) が残っている
 * - JSON ファイルとして解析できない (マニフェストで JSONC と指定されたファイルを除く)
 * - マニフェストの禁止パターンに合致する内容が含まれている
 *
 * 出力先に元からあったファイルを検査しないよう、検査対象は指定されたファイルに限ります。
 *
 * @param destination - 出力先ディレクトリ
 * @param paths - 検査するファイルの出力先からの相対パス (`/` 区切り)
 * @param manifest - テンプレートのマニフェスト
 * @param values - 確定した変数の組
 * @returns 検出した問題の一覧。問題がない場合は空
 */
export async function inspectOutput(
  destination: string,
  paths: readonly string[],
  manifest: TemplateManifest,
  values: VariableValues,
): Promise<InspectionFinding[]> {
  const findings: InspectionFinding[] = [];
  const forbidden = manifest.forbiddenPatterns
    .filter((rule) => !rule.when || matchesCondition(rule.when, values))
    .map((rule) => ({ regex: new RegExp(rule.pattern), reason: rule.reason }));

  for (const path of paths) {
    if (path.endsWith(TEMPLATE_EXTENSION)) {
      findings.push({
        path,
        message: "テンプレート拡張子のファイルが残っています",
      });
    }

    const text = await readTextFile(join(destination, ...path.split("/")));
    if (text === undefined) {
      continue;
    }

    if (UNRENDERED_TAG.test(text)) {
      findings.push({
        path,
        message: "描画されていないテンプレートタグが残っています",
      });
    }
    if (
      path.endsWith(".json") &&
      !manifest.jsonc.some((glob) => minimatch(path, glob, { dot: true }))
    ) {
      try {
        JSON.parse(text);
      } catch {
        findings.push({ path, message: "JSON として解析できません" });
      }
    }
    for (const { regex, reason } of forbidden) {
      if (regex.test(text)) {
        findings.push({
          path,
          message: `禁止パターンに合致しました: ${reason}`,
        });
      }
    }
  }

  return findings;
}

/**
 * ファイルを UTF-8 テキストとして読み込んで応答します。バイナリとみられるファイルは `undefined` を応答します。
 */
async function readTextFile(path: string): Promise<string | undefined> {
  const buffer = await readFile(path).catch(() => undefined);
  if (buffer === undefined || buffer.includes(0)) {
    return undefined;
  }
  return buffer.toString("utf8");
}
