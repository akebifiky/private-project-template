import Link from "@docusaurus/Link";
import { usePluginData } from "@docusaurus/useGlobalData";
import type { AdrTcIndexData } from "@site/src/plugins/adr-tc-index";
import type { ReactNode } from "react";

/**
 * ADR 一覧を、ビルド時に `adr-tc-index-plugin` (`src/plugins/adr-tc-index`) が
 * 構築したデータから描画するコンポーネントです。
 *
 * 一覧の内容はビルド時に ADR ディレクトリを走査して動的に構築されるものであり、
 * このコンポーネント・プラグインのいずれも一覧の内容をファイルへ書き込む工程を持ちません (ADR-0159) 。
 *
 * @returns ADR 番号昇順の箇条書き一覧。
 */
export default function AdrIndexList(): ReactNode {
  const { adrRows } = usePluginData("adr-tc-index-plugin") as AdrTcIndexData;

  return (
    <ul>
      {adrRows.map((row) => (
        <li key={row.slug}>
          <Link to={`/docs/adr/${row.slug}`}>{row.displayHeading}</Link>
        </li>
      ))}
    </ul>
  );
}
