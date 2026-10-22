/**
 * 採番対象 (ADR/TC) の1ファイルが持つ、重複検証に必要な最小限の情報を示す型です。
 */
export interface NumberedFile {
  readonly number: number;
  readonly fileName: string;
}

/**
 * ファイル名から抽出した番号が重複していないかを検証します。
 * 並行して作成されたブランチが同じ番号を採番した場合、ファイル名自体は異なるため
 * Git 上はコンフリクトなくマージされてしまう。生成スクリプトの実行時にここで検知する。
 *
 * @param files - 番号とファイル名の組の一覧 (順不同) 。
 * @param prefix - エラーメッセージ・番号表示に用いる接頭辞 ("ADR" または "TC") 。
 * @returns 応答なし。重複がある場合は例外を送出します。
 */
export function assertNoDuplicateNumbers(
  files: readonly NumberedFile[],
  prefix: "ADR" | "TC",
): void {
  const fileNamesByNumber = new Map<number, string[]>();
  for (const file of files) {
    const fileNames = fileNamesByNumber.get(file.number) ?? [];
    fileNames.push(file.fileName);
    fileNamesByNumber.set(file.number, fileNames);
  }

  const duplicates = [...fileNamesByNumber.entries()].filter(
    ([, fileNames]) => fileNames.length > 1,
  );
  if (duplicates.length === 0) {
    return;
  }

  const detail = duplicates
    .map(([number, fileNames]) => {
      const displayNumber = `${prefix}-${String(number).padStart(4, "0")}`;
      return `  - ${displayNumber}: ${fileNames.join(", ")}`;
    })
    .join("\n");
  throw new Error(
    `${prefix} の番号が重複しているファイルがあります。いずれかを採番し直してください:\n${detail}`,
  );
}
