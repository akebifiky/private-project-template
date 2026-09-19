import { join } from "node:path";
import type { LoadContext, Plugin } from "@docusaurus/types";
import type { AdrIndexRow } from "../../models/adr/adr-entry.js";
import { AdrQueryService } from "../../models/adr/adr-query-service.js";
import type { TcEntryData } from "../../models/tc/tc-entry.js";
import { TcQueryService } from "../../models/tc/tc-query-service.js";

/**
 * 本プラグインが `setGlobalData` を通じて Web ページ側へ渡すデータを示す型です。
 */
export interface AdrTcIndexData {
	readonly adrRows: readonly AdrIndexRow[];
	readonly openTcEntries: readonly TcEntryData[];
}

/**
 * ADR ディレクトリ・TC ディレクトリをビルド時に走査し、「ADR 一覧」「Open な TC 一覧」の
 * データを構築して Web ページへ提供する Docusaurus ローカルプラグインです (ADR-0159) 。
 *
 * `content/adr/index.mdx` の `<AdrIndexList />`・`content/technical-concerns/opened-index.mdx` の
 * `<OpenTcIndexList />` (いずれも `src/components/`) が、`usePluginData` 経由で本プラグインの
 * データを取得して一覧を描画する。一覧の内容をファイルへ書き込む工程は持たない。
 *
 * ADR/TC の Frontmatter・見出しを走査する実体は `src/models/adr/adr-query-service.ts`・
 * `src/models/tc/tc-query-service.ts` であり、CLI 検索ツール
 * (`src/cli/commands/adr/search.ts`・`tc/search.ts`) ・lint コマンド (`src/cli/commands/lint.ts`)
 * と共有している。`setGlobalData` は内容を JSON へシリアライズするため、クラスインスタンス
 * (`AdrEntry`・`TcEntry`) ではなくプレーンなデータ (`toIndexRow()`・`toPlainObject()` の戻り値)
 * へ変換してから渡している。
 *
 * @param context - Docusaurus のロードコンテキスト。
 * @returns 本プラグインの定義。
 */
export default function adrTcIndexPlugin(
	context: LoadContext,
): Plugin<AdrTcIndexData> {
	const adrDir = join(context.siteDir, "content", "adr");
	const tcDir = join(context.siteDir, "content", "technical-concerns");

	return {
		name: "adr-tc-index-plugin",

		async loadContent(): Promise<AdrTcIndexData> {
			const adrRows = new AdrQueryService(adrDir)
				.findAll()
				.map((entry) => entry.toIndexRow());
			const openTcEntries = new TcQueryService(tcDir)
				.findAllOpen()
				.map((entry) => entry.toPlainObject());
			return { adrRows, openTcEntries };
		},

		async contentLoaded({ content, actions }): Promise<void> {
			actions.setGlobalData(content);
		},
	};
}
