import type { UIMessage } from "ai";
import type { PageView } from "./types";
import { messageTokens } from "./tokens";

const MESSAGES_PER_PAGE = 12;

export function liveMessageCount(
  messages: UIMessage[],
  pageBreaks: number[] = [],
): number {
  const lastBreak = pageBreaks.length > 0 ? Math.max(...pageBreaks) : -1;
  return Math.max(0, messages.length - lastBreak - 1);
}

function splitAtManualBreaks(
  messages: UIMessage[],
  pageBreaks: number[],
): UIMessage[][] {
  const sorted = [...new Set(pageBreaks)]
    .filter((index) => index >= 0 && index < messages.length)
    .sort((a, b) => a - b);

  const chunks: UIMessage[][] = [];
  let start = 0;

  for (const breakAt of sorted) {
    chunks.push(messages.slice(start, breakAt + 1));
    start = breakAt + 1;
  }

  chunks.push(messages.slice(start));
  return chunks;
}

export function computePages(
  messages: UIMessage[],
  pageBreaks: number[] = [],
): PageView[] {
  if (messages.length === 0) {
    return [
      {
        index: 0,
        label: "Page 1",
        sealed: false,
        messages: [],
        tokenEstimate: 0,
      },
    ];
  }

  const manualChunks = splitAtManualBreaks(messages, pageBreaks);
  const pages: PageView[] = [];

  for (let chunkIndex = 0; chunkIndex < manualChunks.length; chunkIndex += 1) {
    const isLiveChunk = chunkIndex === manualChunks.length - 1;
    const chunk = manualChunks[chunkIndex];

    if (!isLiveChunk) {
      pages.push(buildPage(pages.length, chunk, true));
      continue;
    }

    let buffer: UIMessage[] = [];
    for (const message of chunk) {
      buffer.push(message);
      if (buffer.length >= MESSAGES_PER_PAGE) {
        pages.push(buildPage(pages.length, buffer, true));
        buffer = [];
      }
    }

    if (buffer.length > 0) {
      pages.push(buildPage(pages.length, buffer, false));
    }
  }

  return pages.length > 0
    ? pages
    : [
        {
          index: 0,
          label: "Page 1",
          sealed: false,
          messages: [],
          tokenEstimate: 0,
        },
      ];
}

function buildPage(
  index: number,
  messages: UIMessage[],
  sealed: boolean,
): PageView {
  const tokenEstimate = messages.reduce((sum, m) => sum + messageTokens(m), 0);
  return {
    index,
    label: `Page ${index + 1}`,
    sealed,
    messages,
    tokenEstimate,
  };
}