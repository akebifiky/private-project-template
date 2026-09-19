import { join } from "node:path";
import { Command } from "commander";
import { AdrQueryService } from "../../models/adr/adr-query-service.js";
import { TcQueryService } from "../../models/tc/tc-query-service.js";

const ADR_DIR = join(__dirname, "..", "..", "..", "content", "adr");
const TC_DIR = join(
	__dirname,
	"..",
	"..",
	"..",
	"content",
	"technical-concerns",
);

/**
 * ADR/TC ファイル群の Frontmatter を走査し、番号重複・status: open な TC の
 * trigger_summary 欠落を検知します (ADR-0159 の CI lint ステップ) 。
 *
 * 検証ロジック自体は検索ロジック ({@link AdrQueryService}・{@link TcQueryService}) に
 * 内包されているため、本関数はそれらを呼び出し例外の有無で成否を判定するだけの薄いラッパーです。
 *
 * @returns 応答なし。検証に失敗した場合は例外を送出します。
 */
function lintAdrTc(): void {
	const adrEntries = new AdrQueryService(ADR_DIR).findAll();
	const openTcEntries = new TcQueryService(TC_DIR).findAllOpen();

	console.log(
		`ADR/TC の Frontmatter を検証しました (ADR ${adrEntries.length} 件、Open な TC ${openTcEntries.length} 件) 。番号重複・trigger_summary 欠落はありません。`,
	);
}

/**
 * ADR/TC の Frontmatter 検証コマンド (`lint`) を生成して応答します。
 *
 * @returns 生成された Commander コマンド。
 */
export function createLintCommand(): Command {
	return new Command("lint")
		.description("ADR/TC の Frontmatter を検証します")
		.action(() => {
			try {
				lintAdrTc();
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`ADR/TC の Frontmatter 検証に失敗しました: ${message}`);
				process.exitCode = 1;
			}
		});
}
