const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const MAX_SECTION_CHARS = 600 * 4; // ~600 tokens ≈ length / 4

export interface RawChunk {
  headingPath: string;
  content: string;
  tags: string[];
  links: string[];
}

interface Section {
  headingPath: string;
  body: string;
}

/** Extract inline #tags (not markdown headings). */
export function extractTags(text: string): string[] {
  const tags = new Set<string>();
  const re = /(^|[^#\w])#([A-Za-z][\w/-]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    tags.add(match[2]);
  }
  return [...tags];
}

/** Extract [[wikilinks]], dropping optional display aliases. */
export function extractLinks(text: string): string[] {
  const links = new Set<string>();
  const re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const target = match[1].trim();
    if (target) links.add(target);
  }
  return [...links];
}

function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function subSplitIfNeeded(headingPath: string, body: string): RawChunk[] {
  const trimmed = body.trim();
  if (!trimmed) return [];

  if (approxTokens(trimmed) <= 600 && trimmed.length <= MAX_SECTION_CHARS) {
    return [
      {
        headingPath,
        content: trimmed,
        tags: extractTags(trimmed),
        links: extractLinks(trimmed),
      },
    ];
  }

  const paragraphs = splitParagraphs(trimmed);
  if (paragraphs.length <= 1) {
    return [
      {
        headingPath,
        content: trimmed,
        tags: extractTags(trimmed),
        links: extractLinks(trimmed),
      },
    ];
  }

  const chunks: RawChunk[] = [];
  let buffer = "";

  const flush = () => {
    const content = buffer.trim();
    if (!content) return;
    chunks.push({
      headingPath,
      content,
      tags: extractTags(content),
      links: extractLinks(content),
    });
    buffer = "";
  };

  for (const para of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${para}` : para;
    if (buffer && approxTokens(candidate) > 600) {
      flush();
      buffer = para;
    } else {
      buffer = candidate;
    }
  }
  flush();
  return chunks;
}

function sectionsFromBody(body: string): Section[] {
  const lines = body.split(/\r?\n/);
  const stack: { level: number; title: string }[] = [];
  const sections: Section[] = [];

  let currentPath = "";
  let currentLines: string[] = [];

  const flush = () => {
    const text = currentLines.join("\n").trim();
    if (text.length > 0 || currentPath) {
      sections.push({ headingPath: currentPath, body: text });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const match = HEADING_RE.exec(line);
    if (match) {
      flush();
      const level = match[1].length;
      const title = match[2].trim();
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      stack.push({ level, title });
      currentPath = stack.map((h) => h.title).join(" > ");
      continue;
    }
    currentLines.push(line);
  }
  flush();

  // Drop empty preamble with no heading
  return sections.filter((s) => s.body.length > 0 || s.headingPath.length > 0);
}

/**
 * Split markdown body on headings into chunks with heading ancestry.
 * Oversized sections are sub-split on blank-line paragraph boundaries.
 */
export function chunkMarkdown(body: string): RawChunk[] {
  const sections = sectionsFromBody(body);
  const chunks: RawChunk[] = [];
  for (const section of sections) {
    // Include the leaf heading title in content context when body is empty? Keep body only.
    chunks.push(...subSplitIfNeeded(section.headingPath, section.body));
  }
  return chunks;
}
