import type { UIMessage } from "ai";
import { countItems, DEFAULT_COUNTING_TYPE } from "./counting-types";
import { parseModelRef } from "./model-ref";
import { computePages, pageCountForConversation } from "./pages";
import { resolveMessageMatchSection } from "./session-outline";
import { messageText } from "./tokens";
import type { ConversationRecord, ProviderId } from "./types";

export type ConversationSearchScope = "title" | "messages";

export const DEFAULT_CONVERSATION_SEARCH_SCOPE: ConversationSearchScope =
  "title";

export const CONVERSATION_SEARCH_SCOPE_LABELS: Record<
  ConversationSearchScope,
  string
> = {
  title: "Titles",
  messages: "Messages",
};

export const CONVERSATION_SEARCH_PLACEHOLDERS: Record<
  ConversationSearchScope,
  string
> = {
  title: "Filter by title or model…",
  messages: "Search message text…",
};

export type ConversationSearchMatch = {
  id: string;
  pageIndex: number;
  pageLabel: string;
  messageIndex: number;
  role: UIMessage["role"];
  snippet: string;
  headingSlug?: string;
  sectionLabel: string;
};

export type ConversationListEntry = {
  conversation: ConversationRecord;
  messageMatches?: ConversationSearchMatch[];
};

export const MAX_MESSAGE_MATCHES_PER_CONVERSATION = 12;

export type ConversationSortId =
  | "updated-desc"
  | "updated-asc"
  | "created-desc"
  | "created-asc"
  | "title-asc"
  | "title-desc"
  | "qa-desc"
  | "pages-desc";

export const DEFAULT_CONVERSATION_SORT: ConversationSortId = "updated-desc";

export const CONVERSATION_SORT_LABELS: Record<ConversationSortId, string> = {
  "updated-desc": "Recently updated",
  "updated-asc": "Oldest updated",
  "created-desc": "Recently created",
  "created-asc": "Oldest created",
  "title-asc": "Title A–Z",
  "title-desc": "Title Z–A",
  "qa-desc": "Most Q&As",
  "pages-desc": "Most pages",
};

export type ConversationFilterId =
  | "all"
  | "multi-page"
  | "single-page"
  | "has-qa"
  | "empty"
  | ProviderId;

export const DEFAULT_CONVERSATION_FILTER: ConversationFilterId = "all";

export type ConversationListQuery = {
  search: string;
  searchScope: ConversationSearchScope;
  filter: ConversationFilterId;
  sort: ConversationSortId;
};

const SNIPPET_PAD = 28;

function pageIndexForMessage(
  messageIndex: number,
  pageBreaks: number[],
  messageCount: number,
): number {
  const sorted = [...new Set(pageBreaks)]
    .filter((index) => index >= 0 && index < messageCount)
    .sort((a, b) => a - b);

  let pageIndex = 0;
  for (const breakAt of sorted) {
    if (messageIndex <= breakAt) return pageIndex;
    pageIndex += 1;
  }
  return pageIndex;
}

function extractMatchSnippetAt(
  text: string,
  query: string,
  matchIndex: number,
): string {
  const start = Math.max(0, matchIndex - SNIPPET_PAD);
  const end = Math.min(text.length, matchIndex + query.length + SNIPPET_PAD);
  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  return snippet;
}

function findMessageMatches(
  conv: ConversationRecord,
  search: string,
): ConversationSearchMatch[] {
  const query = search.trim();
  const queryLower = query.toLowerCase();
  if (!queryLower) return [];

  const pages = computePages(conv.messages, conv.pageBreaks);
  const matches: ConversationSearchMatch[] = [];

  for (
    let messageIndex = 0;
    messageIndex < conv.messages.length;
    messageIndex += 1
  ) {
    if (matches.length >= MAX_MESSAGE_MATCHES_PER_CONVERSATION) break;

    const message = conv.messages[messageIndex]!;
    const text = messageText(message);
    const lower = text.toLowerCase();
    const pageIndex = pageIndexForMessage(
      messageIndex,
      conv.pageBreaks,
      conv.messages.length,
    );
    const page = pages[pageIndex];
    if (!page) continue;

    let start = 0;
    while (
      start < lower.length &&
      matches.length < MAX_MESSAGE_MATCHES_PER_CONVERSATION
    ) {
      const matchIndex = lower.indexOf(queryLower, start);
      if (matchIndex === -1) break;

      const section = resolveMessageMatchSection(page, message, matchIndex);

      matches.push({
        id: `${messageIndex}-${matchIndex}`,
        pageIndex,
        pageLabel: page.label,
        messageIndex,
        role: message.role,
        snippet: extractMatchSnippetAt(text, query, matchIndex),
        headingSlug: section.headingSlug,
        sectionLabel: section.sectionLabel,
      });

      start = matchIndex + query.length;
    }
  }

  return matches;
}

function matchesTitleSearch(conv: ConversationRecord, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  if (conv.title.toLowerCase().includes(query)) return true;
  if (conv.modelId.toLowerCase().includes(query)) return true;

  const ref = parseModelRef(conv.modelId);
  if (ref?.modelId.toLowerCase().includes(query)) return true;

  return false;
}

function matchesSearch(
  conv: ConversationRecord,
  search: string,
  searchScope: ConversationSearchScope,
  messageMatches?: ConversationSearchMatch[],
): boolean {
  const query = search.trim();
  if (!query) return true;

  if (searchScope === "title") {
    return matchesTitleSearch(conv, search);
  }

  return (messageMatches?.length ?? 0) > 0;
}

function matchesFilter(
  conv: ConversationRecord,
  filter: ConversationFilterId,
): boolean {
  if (filter === "all") return true;

  const pageCount = pageCountForConversation(conv.messages, conv.pageBreaks);
  const qaCount = countItems(conv.messages, DEFAULT_COUNTING_TYPE);

  switch (filter) {
    case "multi-page":
      return pageCount > 1;
    case "single-page":
      return pageCount === 1;
    case "has-qa":
      return qaCount > 0;
    case "empty":
      return qaCount === 0;
    default: {
      const ref = parseModelRef(conv.modelId);
      return ref?.provider === filter;
    }
  }
}

function compareConversations(
  a: ConversationRecord,
  b: ConversationRecord,
  sort: ConversationSortId,
): number {
  switch (sort) {
    case "updated-desc":
      return b.updatedAt - a.updatedAt;
    case "updated-asc":
      return a.updatedAt - b.updatedAt;
    case "created-desc":
      return b.createdAt - a.createdAt;
    case "created-asc":
      return a.createdAt - b.createdAt;
    case "title-asc":
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    case "title-desc":
      return b.title.localeCompare(a.title, undefined, { sensitivity: "base" });
    case "qa-desc": {
      const qaDiff =
        countItems(b.messages, DEFAULT_COUNTING_TYPE) -
        countItems(a.messages, DEFAULT_COUNTING_TYPE);
      return qaDiff || b.updatedAt - a.updatedAt;
    }
    case "pages-desc": {
      const pageDiff =
        pageCountForConversation(b.messages, b.pageBreaks) -
        pageCountForConversation(a.messages, a.pageBreaks);
      return pageDiff || b.updatedAt - a.updatedAt;
    }
  }
}

export function applyConversationListQuery(
  conversations: ConversationRecord[],
  query: ConversationListQuery,
): ConversationListEntry[] {
  const searchActive = query.search.trim().length > 0;
  const includeMessageMatches =
    searchActive && query.searchScope === "messages";

  const entries = conversations
    .filter((conv) => matchesFilter(conv, query.filter))
    .map((conversation) => ({
      conversation,
      messageMatches: includeMessageMatches
        ? findMessageMatches(conversation, query.search)
        : undefined,
    }))
    .filter((entry) =>
      matchesSearch(
        entry.conversation,
        query.search,
        query.searchScope,
        entry.messageMatches,
      ),
    );

  return entries.sort((a, b) =>
    compareConversations(a.conversation, b.conversation, query.sort),
  );
}

export function isConversationListQueryActive(
  query: ConversationListQuery,
): boolean {
  return (
    query.search.trim().length > 0 ||
    query.filter !== DEFAULT_CONVERSATION_FILTER ||
    query.sort !== DEFAULT_CONVERSATION_SORT
  );
}