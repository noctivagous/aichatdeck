import type { UIMessage } from "ai";
import type { PageView } from "./types";
import {
  countItems,
  DEFAULT_COUNTING_TYPE,
  type CountingTypeId,
} from "./counting-types";
import { messageTokens } from "./tokens";

const QA_PER_PAGE = 12;

function splitAtBreaks(
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

/** Derive sealed pages; empty stored state on multi-page decks uses legacy defaults. */
export function effectiveSealedPageIndices(
  sealedPageIndices: number[],
  pageCount: number,
): number[] {
  if (pageCount <= 1 || sealedPageIndices.length > 0) {
    return sealedPageIndices;
  }

  return Array.from({ length: pageCount - 1 }, (_, index) => index);
}

function isPageSealed(
  pageIndex: number,
  sealedPageIndices: number[],
  pageCount: number,
): boolean {
  return effectiveSealedPageIndices(sealedPageIndices, pageCount).includes(
    pageIndex,
  );
}

function computePagesLegacy(
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

  const manualChunks = splitAtBreaks(messages, pageBreaks);
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
      if (countItems(buffer, DEFAULT_COUNTING_TYPE) >= QA_PER_PAGE) {
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

export function materializePageBreaks(
  messages: UIMessage[],
  pageBreaks: number[] = [],
): number[] {
  const pages = computePagesLegacy(messages, pageBreaks);
  if (pages.length <= 1) return [];

  const breaks: number[] = [];
  let cursor = 0;
  for (let index = 0; index < pages.length - 1; index += 1) {
    cursor += pages[index].messages.length;
    breaks.push(cursor - 1);
  }
  return breaks;
}

export type ConversationPageState = {
  pageBreaks: number[];
  sealedPageIndices: number[];
  activePageIndex: number;
};

export function normalizeConversationPageState(
  messages: UIMessage[],
  pageBreaks: number[] = [],
  sealedPageIndices?: number[],
  activePageIndex?: number,
): ConversationPageState {
  const materialized = materializePageBreaks(messages, pageBreaks);
  const pageCount = Math.max(1, splitAtBreaks(messages, materialized).length);
  const hasStoredSealState =
    sealedPageIndices !== undefined &&
    activePageIndex !== undefined &&
    (sealedPageIndices.length > 0 || pageCount <= 1);

  if (hasStoredSealState) {
    return {
      pageBreaks: materialized,
      sealedPageIndices,
      activePageIndex,
    };
  }

  const legacyPages = computePagesLegacy(messages, pageBreaks);
  const sealed = legacyPages
    .map((page, index) => (page.sealed ? index : -1))
    .filter((index) => index >= 0);
  const active = legacyPages.findIndex((page) => !page.sealed);

  return {
    pageBreaks: materialized,
    sealedPageIndices: sealed,
    activePageIndex:
      active >= 0 ? active : Math.max(0, legacyPages.length - 1),
  };
}

/** Page that should receive the next prompt, based on the centered slide. */
export function resolveComposePageIndex(
  focusedPageIndex: number,
  pages: PageView[],
): number {
  if (pages.length === 0) return -1;

  const focused = Math.min(Math.max(0, focusedPageIndex), pages.length - 1);
  const focusedPage = pages[focused];

  if (focusedPage && !focusedPage.sealed) {
    return focused;
  }

  for (let index = focused + 1; index < pages.length; index += 1) {
    if (!pages[index]?.sealed) return index;
  }

  return -1;
}

export function hasComposeTarget(
  focusedPageIndex: number,
  pages: PageView[],
): boolean {
  return resolveComposePageIndex(focusedPageIndex, pages) >= 0;
}

export function computePages(
  messages: UIMessage[],
  pageBreaks: number[] = [],
  sealedPageIndices: number[] = [],
): PageView[] {
  if (messages.length === 0) {
    return [
      {
        index: 0,
        label: "Page 1",
        sealed: isPageSealed(0, sealedPageIndices, 1),
        messages: [],
        tokenEstimate: 0,
      },
    ];
  }

  const chunks = splitAtBreaks(messages, pageBreaks);
  return chunks.map((chunk, index) =>
    buildPage(
      index,
      chunk,
      isPageSealed(index, sealedPageIndices, chunks.length),
    ),
  );
}

export function activePageItemCount(
  messages: UIMessage[],
  pageBreaks: number[] = [],
  sealedPageIndices: number[] = [],
  activePageIndex = 0,
  countingType: CountingTypeId = DEFAULT_COUNTING_TYPE,
): number {
  const range = computePageMessageRanges(
    messages,
    pageBreaks,
    sealedPageIndices,
  )[activePageIndex];
  if (!range) return 0;
  return countItems(
    messages.slice(range.startIndex, range.endIndex + 1),
    countingType,
  );
}

export function liveItemCount(
  messages: UIMessage[],
  pageBreaks: number[] = [],
  countingType: CountingTypeId = DEFAULT_COUNTING_TYPE,
  sealedPageIndices: number[] = [],
  activePageIndex = 0,
): number {
  return activePageItemCount(
    messages,
    pageBreaks,
    sealedPageIndices,
    activePageIndex,
    countingType,
  );
}

/** @deprecated Use {@link liveItemCount} */
export function liveMessageCount(
  messages: UIMessage[],
  pageBreaks: number[] = [],
): number {
  return liveItemCount(messages, pageBreaks, "messages");
}

export function pageCountForConversation(
  messages: UIMessage[],
  pageBreaks: number[] = [],
  sealedPageIndices: number[] = [],
): number {
  return computePages(messages, pageBreaks, sealedPageIndices).length;
}

export function formatPageCountLabel(count: number): string {
  return `${count} page${count === 1 ? "" : "s"}`;
}

export type PageMessageRange = {
  startIndex: number;
  endIndex: number;
  sealed: boolean;
};

export function computePageMessageRanges(
  messages: UIMessage[],
  pageBreaks: number[] = [],
  sealedPageIndices: number[] = [],
): PageMessageRange[] {
  const pages = computePages(messages, pageBreaks, sealedPageIndices);
  const ranges: PageMessageRange[] = [];
  let cursor = 0;

  for (const page of pages) {
    const length = page.messages.length;
    ranges.push({
      startIndex: cursor,
      endIndex: cursor + length - 1,
      sealed: page.sealed,
    });
    cursor += length;
  }

  return ranges;
}

export function getPageInsertIndex(
  pageIndex: number,
  messages: UIMessage[],
  pageBreaks: number[] = [],
  sealedPageIndices: number[] = [],
): number {
  const range = computePageMessageRanges(
    messages,
    pageBreaks,
    sealedPageIndices,
  )[pageIndex];
  if (!range || range.endIndex < 0) return messages.length;
  return range.endIndex + 1;
}

export function shiftPageBreaks(
  pageBreaks: number[],
  insertIndex: number,
  delta: number,
): number[] {
  if (delta === 0) return pageBreaks;
  return pageBreaks
    .map((value) => (value >= insertIndex ? value + delta : value))
    .sort((a, b) => a - b);
}

function findFirstUnsealedIndex(
  sealedPageIndices: number[],
  pageCount: number,
): number {
  for (let index = 0; index < pageCount; index += 1) {
    if (!isPageSealed(index, sealedPageIndices, pageCount)) return index;
  }
  return -1;
}

export function setPageSealState(
  pageIndex: number,
  sealed: boolean,
  sealedPageIndices: number[],
  activePageIndex: number,
  pageCount: number,
): Pick<ConversationPageState, "sealedPageIndices" | "activePageIndex"> {
  const set = new Set(
    effectiveSealedPageIndices(sealedPageIndices, pageCount),
  );

  if (sealed) {
    set.add(pageIndex);
    const nextSealed = [...set].sort((a, b) => a - b);
    const nextActive =
      pageIndex === activePageIndex
        ? findFirstUnsealedIndex(nextSealed, pageCount)
        : activePageIndex;
    return {
      sealedPageIndices: nextSealed,
      activePageIndex: nextActive,
    };
  }

  set.delete(pageIndex);
  return {
    sealedPageIndices: [...set].sort((a, b) => a - b),
    activePageIndex: pageIndex,
  };
}

export function sealActivePageBeforeNewPage(
  messages: UIMessage[],
  pageBreaks: number[],
  sealedPageIndices: number[],
  activePageIndex: number,
): ConversationPageState {
  if (messages.length === 0) {
    return { pageBreaks, sealedPageIndices, activePageIndex: 0 };
  }

  const ranges = computePageMessageRanges(
    messages,
    pageBreaks,
    sealedPageIndices,
  );
  const activeRange = ranges[activePageIndex];
  if (!activeRange) {
    return { pageBreaks, sealedPageIndices, activePageIndex };
  }

  const nextBreaks = pageBreaks.includes(activeRange.endIndex)
    ? pageBreaks
    : [...pageBreaks, activeRange.endIndex].sort((a, b) => a - b);
  const nextSealed = [
    ...new Set([
      ...effectiveSealedPageIndices(
        sealedPageIndices,
        computePages(messages, nextBreaks, sealedPageIndices).length,
      ),
      activePageIndex,
    ]),
  ].sort((a, b) => a - b);
  const nextPages = computePages(messages, nextBreaks, nextSealed);

  return {
    pageBreaks: nextBreaks,
    sealedPageIndices: nextSealed,
    activePageIndex: Math.max(0, nextPages.length - 1),
  };
}

export function maybeAutoSealActivePage(
  messages: UIMessage[],
  pageBreaks: number[],
  sealedPageIndices: number[],
  activePageIndex: number,
): ConversationPageState | null {
  const pages = computePages(messages, pageBreaks, sealedPageIndices);
  if (activePageIndex < 0 || activePageIndex !== pages.length - 1) return null;

  const activePage = pages[activePageIndex];
  if (!activePage || activePage.sealed) return null;
  if (countItems(activePage.messages, DEFAULT_COUNTING_TYPE) < QA_PER_PAGE) {
    return null;
  }

  const range = computePageMessageRanges(
    messages,
    pageBreaks,
    sealedPageIndices,
  )[activePageIndex];
  if (!range || range.endIndex < range.startIndex) return null;

  let qaCount = 0;
  let splitEnd = range.endIndex;
  for (let index = range.startIndex; index <= range.endIndex; index += 1) {
    if (messages[index]?.role === "user") qaCount += 1;
    if (qaCount >= QA_PER_PAGE) {
      splitEnd = index;
      break;
    }
  }

  if (pageBreaks.includes(splitEnd)) return null;

  return {
    pageBreaks: [...pageBreaks, splitEnd].sort((a, b) => a - b),
    sealedPageIndices: [
      ...new Set([...sealedPageIndices, activePageIndex]),
    ].sort((a, b) => a - b),
    activePageIndex: activePageIndex + 1,
  };
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