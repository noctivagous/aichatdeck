export type MarkdownColumnSegment = {
  kind: "flow" | "block";
  text: string;
};

const GFM_TABLE_RE =
  /\|[^\n]+\|\r?\n\|[\s|:-]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+/g;

const HEADING_LINE_RE = /^#{1,6}\s+.+$/;

function trimSegment(text: string): string {
  return text.trim();
}

function headingBeforeTable(prefix: string): number | null {
  const lines = prefix.split("\n");
  let index = lines.length - 1;

  while (index >= 0 && lines[index]?.trim() === "") {
    index -= 1;
  }

  if (index < 0 || !HEADING_LINE_RE.test(lines[index]!.trim())) {
    return null;
  }

  const headingLine = lines[index]!.trim();
  return prefix.lastIndexOf(headingLine);
}

export function segmentMarkdownForColumns(
  markdown: string,
): MarkdownColumnSegment[] {
  const segments: MarkdownColumnSegment[] = [];
  const tables = [...markdown.matchAll(GFM_TABLE_RE)];

  if (tables.length === 0) {
    const text = trimSegment(markdown);
    return text ? [{ kind: "flow", text }] : [];
  }

  let cursor = 0;

  for (const match of tables) {
    const tableStart = match.index ?? 0;
    const prefix = markdown.slice(cursor, tableStart);
    let blockStart = tableStart;

    const headingStart = headingBeforeTable(prefix);
    if (headingStart !== null) {
      const flowText = trimSegment(prefix.slice(0, headingStart));
      if (flowText) segments.push({ kind: "flow", text: flowText });
      blockStart = cursor + headingStart;
    } else {
      const flowText = trimSegment(prefix);
      if (flowText) segments.push({ kind: "flow", text: flowText });
    }

    const blockEnd = tableStart + match[0].length;
    const blockText = trimSegment(markdown.slice(blockStart, blockEnd));
    if (blockText) segments.push({ kind: "block", text: blockText });
    cursor = blockEnd;
  }

  const tail = trimSegment(markdown.slice(cursor));
  if (tail) segments.push({ kind: "flow", text: tail });

  return segments;
}