/**
 * ADR ファイルの Frontmatter を示す型です。
 */
export interface AdrFrontmatter {
  readonly status: string;
  readonly date: string;
  readonly decision_makers: string;
  readonly supersedes: readonly string[] | null;
  readonly superseded_by: readonly string[] | null;
  readonly partially_supersedes?: readonly string[] | null;
  readonly partially_superseded_by?: readonly string[] | null;
}
