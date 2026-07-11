import matter from "gray-matter";

export interface ParsedMarkdown {
  data: Record<string, unknown>;
  content: string;
}

/** Split YAML frontmatter (`data`) from the markdown body (`content`). */
export function parseFrontmatter(raw: string): ParsedMarkdown {
  const parsed = matter(raw);
  return {
    data: (parsed.data ?? {}) as Record<string, unknown>,
    content: parsed.content ?? "",
  };
}
