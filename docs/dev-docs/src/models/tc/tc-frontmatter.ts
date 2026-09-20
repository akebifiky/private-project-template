/**
 * TC ファイルの Frontmatter を示す型です。
 */
export interface TcFrontmatter {
  readonly id: string;
  readonly title: string;
  readonly status: "open" | "resolved";
  readonly date: string;
  readonly tags: readonly string[];
  readonly trigger_summary?: string | null;
  readonly resolution?: string | null;
  readonly resolved_at?: string | null;
}
