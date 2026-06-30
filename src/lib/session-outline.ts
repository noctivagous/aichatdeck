import type { PageView } from "@/lib/types";
import { messageText } from "@/lib/tokens";
import type { UIMessage } from "ai";

export type OutlineEntry = {
  level: 1 | 2 | 3;
  text: string;
  slug: string;
};

export type OutlineItem =
  | { kind: "userPrompt"; text: string }
  | { kind: "heading"; entry: OutlineEntry };

export type OutlinePage = {
  pageIndex: number;
  label: string;
  sealed: boolean;
  messageCount: number;
  entries: OutlineEntry[];
  /** Sidebar rows in source order (user prompts + assistant headings). */
  items: OutlineItem[];
};

export type SessionOutline = {
  title: string;
  pageCount: number;
  tokenEstimate: number;
  pages: OutlinePage[];
};

const HEADING_RE = /^\s{0,3}(#{1,3})[ \t]+(.+)$/;
const FALLBACK_MAX = 60;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function trimSnippet(text: string, max = FALLBACK_MAX): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

type HeadingSlugIterator = {
  entriesFromMarkdown: (markdown: string) => OutlineEntry[];
};

type HeadingCandidate = {
  level: 1 | 2 | 3;
  text: string;
};

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/\\([\\`*_{}\[\]()#+\-.!])/g, "$1")
    .trim();
}

function extractHeadingCandidates(markdown: string): HeadingCandidate[] {
  const entries: HeadingCandidate[] = [];
  let openFence: { marker: "`" | "~"; length: number } | null = null;

  for (const rawLine of markdown.split("\n")) {
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
      continue;
    }

    if (openFence) continue;

    const match = HEADING_RE.exec(line);
    if (!match) continue;

    const level = match[1]!.length as 1 | 2 | 3;
    const text = stripInlineMarkdown(
      match[2]!
      .replace(/\s+#+\s*$/, "")
      .trim(),
    );
    if (!text) continue;
    entries.push({ level, text });
  }

  return entries;
}

function assistantMessageTextParts(message: UIMessage): string[] {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text);
}

function createHeadingSlugIterator(): HeadingSlugIterator {
  const slugCounts = new Map<string, number>();

  const nextSlug = (text: string): string => {
    const base = slugify(text) || "section";
    const count = slugCounts.get(base) ?? 0;
    slugCounts.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };

  return {
    entriesFromMarkdown(markdown: string) {
      return extractHeadingCandidates(markdown).map((entry) => ({
        ...entry,
        slug: nextSlug(entry.text),
      }));
    },
  };
}

function entriesFromAssistantMessage(
  message: UIMessage,
  iterator: HeadingSlugIterator,
): OutlineEntry[] {
  return assistantMessageTextParts(message).flatMap((textPart) =>
    iterator.entriesFromMarkdown(textPart),
  );
}

export function assistantMarkdownForPage(page: PageView): string {
  return page.messages
    .filter((m) => m.role === "assistant")
    .map((m) => messageText(m))
    .join("\n\n");
}

export function extractHeadingsFromMarkdown(markdown: string): OutlineEntry[] {
  return createHeadingSlugIterator().entriesFromMarkdown(markdown);
}

/** Slugs per assistant message, in render order (shared counter across the page). */
export function buildMessageHeadingSlugPlan(
  page: PageView,
): Map<string, string[]> {
  const iterator = createHeadingSlugIterator();
  const plan = new Map<string, string[]>();

  for (const msg of page.messages) {
    if (msg.role !== "assistant") continue;
    const entries = entriesFromAssistantMessage(msg, iterator);
    plan.set(
      msg.id,
      entries.map((entry) => entry.slug),
    );
  }

  return plan;
}

function buildOutlinePage(page: PageView): OutlinePage {
  const iterator = createHeadingSlugIterator();
  const entries: OutlineEntry[] = [];
  const items: OutlineItem[] = [];

  for (const message of page.messages) {
    if (message.role === "user") {
      const text = trimSnippet(messageText(message));
      if (text) {
        items.push({ kind: "userPrompt", text });
      }
      continue;
    }

    if (message.role !== "assistant") continue;
    const messageEntries = entriesFromAssistantMessage(message, iterator);
    for (const entry of messageEntries) {
      entries.push(entry);
      items.push({ kind: "heading", entry });
    }
  }

  return {
    pageIndex: page.index,
    label: page.label,
    sealed: page.sealed,
    messageCount: page.messages.length,
    entries,
    items,
  };
}

export function buildSessionOutline(
  title: string,
  pages: PageView[],
): SessionOutline {
  const tokenEstimate = pages.reduce((sum, p) => sum + p.tokenEstimate, 0);

  return {
    title,
    pageCount: pages.length,
    tokenEstimate,
    pages: pages.map(buildOutlinePage),
  };
}