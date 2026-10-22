import { resolve } from "node:path";

/** テンプレートデータを格納するディレクトリ */
export const TEMPLATES_ROOT = resolve(
  import.meta.dirname,
  "..",
  "..",
  "templates",
);
