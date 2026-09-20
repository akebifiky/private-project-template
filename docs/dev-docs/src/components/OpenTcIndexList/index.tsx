import Link from "@docusaurus/Link";
import { usePluginData } from "@docusaurus/useGlobalData";
import type { AdrTcIndexData } from "@site/src/plugins/adr-tc-index";
import type { ReactNode } from "react";

/**
 * Open な TC 一覧を、ビルド時に `adr-tc-index-plugin` (`src/plugins/adr-tc-index`) が
 * 構築したデータから描画するコンポーネントです。
 *
 * 一覧の内容はビルド時に TC ディレクトリを走査して動的に構築されるものであり、
 * このコンポーネント・プラグインのいずれも一覧の内容をファイルへ書き込む工程を持ちません (ADR-0159) 。
 * Resolved となった TC は `status: open` でなくなった時点で自動的に一覧から除外される。
 *
 * @returns TC 番号昇順のテーブル。Open な TC が存在しない場合はその旨のメッセージ。
 */
export default function OpenTcIndexList(): ReactNode {
  const { openTcEntries } = usePluginData(
    "adr-tc-index-plugin",
  ) as AdrTcIndexData;

  if (openTcEntries.length === 0) {
    return <p>現在 Open な TC はありません。</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>概要</th>
          <th>タグ</th>
          <th>トリガー条件 (要約)</th>
        </tr>
      </thead>
      <tbody>
        {openTcEntries.map((entry) => (
          <tr key={entry.id}>
            <td>
              <Link to={`/docs/technical-concerns/${entry.id}`}>
                {entry.id}
              </Link>
            </td>
            <td>{entry.title}</td>
            <td>{entry.tags.join(", ")}</td>
            <td>{entry.triggerSummary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
