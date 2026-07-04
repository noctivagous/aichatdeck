import { Lexer } from "marked";

const HEADING_RE = /^\s{0,3}(#{1,3})[ \t]+.+$/;

export type MarkdownBlockSplitState = {
  source: string;
  blocks: string[];
};

function walkLines<T>(
  markdown: string,
  onLine: (
    line: string,
    context: { insideFence: boolean },
  ) => T | null,
): T[] {
  const results: T[] = [];
  let openFence: { marker: "`" | "~"; length: number } | null = null;
  const lines = markdown.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    const fenceMatch = /^\s{0,3}([`~]{3,})/.exec(line);

    if (fenceMatch) {
      const fence = fenceMatch[1]!;
      const marker = fence[0] as "`" | "~";
      if (!openFence) {
        openFence = { marker, length: fence.length };
      } else if (marker === openFence.marker && fence.length >= openFence.length) {
        openFence = null;
      }
    } else if (!openFence) {
      const value = onLine(line, { insideFence: false });
      if (value !== null) results.push(value);
    }
  }

  return results;
}

export function countMarkdownHeadings(markdown: string): number {
  return walkLines(markdown, (line) =>
    HEADING_RE.test(line) ? true : null,
  ).length;
}

export function splitMarkdownIntoBlocks(markdown: string): string[] {
  if (!markdown) return [];

  const tokens = Lexer.lex(markdown, { gfm: true });
  const blocks = tokens
    .map((token) => token.raw)
    .map((raw) => raw.replace(/\s+$/, ""))
    .filter(Boolean);

  return blocks.length > 0 ? blocks : [markdown];
}

function appendedStartsNewBlock(appended: string): boolean {
  if (!appended) return false;
  if (appended.includes("\n\n")) return true;
  return /(?:^|\n)(?:#{1,6}\s|```|(?:[-*+] |\d+\. ))/.test(appended);
}

/** Append-only fast path: extend the last block until a new block boundary appears. */
export function splitMarkdownIntoBlocksStreaming(
  markdown: string,
  previous: MarkdownBlockSplitState | null,
): MarkdownBlockSplitState {
  if (!markdown) {
    return { source: "", blocks: [] };
  }

  if (
    !previous ||
    previous.source.length === 0 ||
    !markdown.startsWith(previous.source) ||
    markdown.length < previous.source.length
  ) {
    const blocks = splitMarkdownIntoBlocks(markdown);
    return { source: markdown, blocks };
  }

  if (markdown === previous.source) {
    return previous;
  }

  const appended = markdown.slice(previous.source.length);
  if (
    !appendedStartsNewBlock(appended) &&
    previous.blocks.length > 0
  ) {
    const blocks = previous.blocks.slice();
    blocks[blocks.length - 1] = blocks[blocks.length - 1] + appended;
    return { source: markdown, blocks };
  }

  return {
    source: markdown,
    blocks: splitMarkdownIntoBlocks(markdown),
  };
}

export function buildBlockSlugOffsets(blocks: string[]): number[] {
  const offsets: number[] = [];
  let cursor = 0;

  for (const block of blocks) {
    offsets.push(cursor);
    cursor += countMarkdownHeadings(block);
  }

  return offsets;
}