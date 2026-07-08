"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { PageView } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { PageColumnCount } from "@/lib/page-columns";
import type { ReplyFontScaleId } from "@/lib/reply-font-size";
import type { ReplyLineHeightId } from "@/lib/reply-line-height";
import { ScrollShortcutHint } from "./ScrollShortcutHint";
import {
  countItems,
  DEFAULT_COUNTING_TYPE,
  formatCountLabel,
} from "@/lib/counting-types";
import { messageText } from "@/lib/tokens";
import {
  effectiveStreamUpdateMode,
  type StreamingDisplaySettings,
} from "@/lib/streaming-display";
import { useThrottledStreamContent } from "@/hooks/useThrottledStreamContent";
import { PageSlugPlanProvider } from "./heading-slug-context";
import { StreamingProgressIndicator } from "./StreamingProgressIndicator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightFromLine,
  LayoutTemplate,
  MoreVertical,
  SplitSquareHorizontal,
  Trash2,
} from "lucide-react";
import {
  canMoveQaAndBeneathToNewPageOnPage,
  canMoveQaToNewPageOnPage,
} from "@/lib/pages";
import {
  findScrollAreaViewport,
  scrollViewportToMessage,
} from "@/lib/scroll-to-heading";
import {
  scrollContainedReplyMaxHeightPx,
  type PageCardLayoutMode,
} from "@/lib/page-card-layout-mode";
import { PageCardLayoutModeControl } from "./PageCardLayoutModeControl";

type PageCardProps = {
  page: PageView;
  isLive: boolean;
  isFocused?: boolean;
  composerFocused?: boolean;
  isStreaming: boolean;
  streamingMessageId?: string;
  autoFollowLiveReply: boolean;
  widthPx: number;
  columnCount: PageColumnCount;
  fontScale: ReplyFontScaleId;
  lineHeight: ReplyLineHeightId;
  onFocus?: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onSealChange?: (sealed: boolean) => void;
  canSeal?: boolean;
  onDelete?: () => void;
  canDelete?: boolean;
  onNewPage?: () => void;
  canNewPage?: boolean;
  onMoveToNewChat?: () => void;
  canMoveToNewChat?: boolean;
  onMovePageLeft?: () => void;
  canMovePageLeft?: boolean;
  onMovePageRight?: () => void;
  canMovePageRight?: boolean;
  onDeleteQa?: (userMessageId: string) => void;
  onMoveQaToNewPage?: (userMessageId: string) => void;
  onMoveQaAndBeneathToNewPage?: (userMessageId: string) => void;
  streamingDisplay?: StreamingDisplaySettings;
  layoutMode?: PageCardLayoutMode;
  onLayoutModeChange?: (mode: PageCardLayoutMode) => void;
};

const SECTION_LABEL_MAX_LENGTH = 42;

const abbreviateSectionLabel = (text: string) => {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return "Conversation section";
  if (compact.length <= SECTION_LABEL_MAX_LENGTH) return compact;
  return `${compact.slice(0, SECTION_LABEL_MAX_LENGTH - 1).trimEnd()}…`;
};

export const PageCard = memo(function PageCard({
  page,
  isLive,
  isFocused = false,
  composerFocused = false,
  isStreaming,
  streamingMessageId,
  autoFollowLiveReply,
  widthPx,
  columnCount,
  fontScale,
  lineHeight,
  onFocus,
  onHoverStart,
  onHoverEnd,
  onSealChange,
  canSeal = false,
  onDelete,
  canDelete = false,
  onNewPage,
  canNewPage = false,
  onMoveToNewChat,
  canMoveToNewChat = false,
  onMovePageLeft,
  canMovePageLeft = false,
  onMovePageRight,
  canMovePageRight = false,
  onDeleteQa,
  onMoveQaToNewPage,
  onMoveQaAndBeneathToNewPage,
  streamingDisplay,
  layoutMode = "scroll",
  onLayoutModeChange,
}: PageCardProps) {
  const containedReplyScroll = layoutMode === "scroll-contained";
  const containedReplyMaxHeightPx = scrollContainedReplyMaxHeightPx(
    fontScale,
    lineHeight,
  );
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);
  const pinnedPromptMessageIdRef = useRef<string | null>(null);
  const wasStreamingRef = useRef(false);
  const seenUserMessageIdsRef = useRef<Set<string>>(new Set());
  const userScrollInitRef = useRef(false);
  const promptScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [composeViewportSpacerPx, setComposeViewportSpacerPx] = useState(0);
  const lastMessage = page.messages[page.messages.length - 1];
  const streamingMessage = streamingMessageId
    ? page.messages.find((message) => message.id === streamingMessageId)
    : undefined;
  const streamingRawText = streamingMessage
    ? messageText(streamingMessage)
    : "";
  const isStreamingMessage = isStreaming && !!streamingMessageId;
  const streamUpdate = effectiveStreamUpdateMode(
    streamingDisplay ?? {
      updateMode: "smooth",
      pacedIntervalMs: 50,
      renderMode: "plain",
      showProgress: true,
    },
  );
  const throttledStream = useThrottledStreamContent(
    streamingRawText,
    isStreamingMessage,
    streamUpdate.updateMode,
    streamUpdate.pacedIntervalMs,
    { streamKey: streamingMessageId },
  );
  const streamingTextLength = streamingRawText.length;

  const showTypingIndicator =
    isLive &&
    isStreaming &&
    (!lastMessage || lastMessage.role !== "assistant");

  const sections = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    let currentId: string | null = null;

    page.messages.forEach((message, index) => {
      if (message.role === "user" || currentId === null) {
        currentId = `section-${page.index}-${index}`;
        const text = messageText(message);
        items.push({
          id: currentId,
          label:
            message.role === "user"
              ? abbreviateSectionLabel(text || "Prompt")
              : abbreviateSectionLabel(text || "Conversation section"),
        });
      }
    });

    return items;
  }, [page.index, page.messages]);

  const messageSectionIds = useMemo(() => {
    const ids = new Map<string, string>();
    let currentId: string | null = null;

    page.messages.forEach((message, index) => {
      if (message.role === "user" || currentId === null) {
        currentId = `section-${page.index}-${index}`;
      }
      ids.set(message.id, currentId);
    });

    return ids;
  }, [page.index, page.messages]);

  useEffect(() => {
    const first = sections[0]?.id ?? null;
    setActiveSectionId((current) =>
      current && sections.some((section) => section.id === current)
        ? current
        : first,
    );
  }, [sections]);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
      "[data-radix-scroll-area-viewport]",
    );
    if (!viewport || sections.length < 2) return;

    const updateActiveSection = () => {
      const messages = viewport.querySelectorAll<HTMLElement>("[data-message-id]");
      if (messages.length === 0) return;

      const viewportTop = viewport.scrollTop + 12;
      let activeId = messages[0].dataset.sectionId ?? sections[0].id;

      for (const message of messages) {
        if (message.offsetTop > viewportTop) break;
        activeId = message.dataset.sectionId ?? activeId;
      }

      setActiveSectionId((current) => (current === activeId ? current : activeId));
    };

    updateActiveSection();
    viewport.addEventListener("scroll", updateActiveSection, { passive: true });
    return () => viewport.removeEventListener("scroll", updateActiveSection);
  }, [sections]);

  useEffect(() => {
    const userMessageIds = page.messages
      .filter((message) => message.role === "user")
      .map((message) => message.id);

    if (!userScrollInitRef.current) {
      seenUserMessageIdsRef.current = new Set(userMessageIds);
      userScrollInitRef.current = true;
      return;
    }

    if (!isLive) {
      seenUserMessageIdsRef.current = new Set(userMessageIds);
      return;
    }

    const newUserMessage = page.messages.find(
      (message) =>
        message.role === "user" &&
        !seenUserMessageIdsRef.current.has(message.id),
    );
    seenUserMessageIdsRef.current = new Set(userMessageIds);

    if (!newUserMessage) return;

    if (promptScrollTimerRef.current) {
      clearTimeout(promptScrollTimerRef.current);
      promptScrollTimerRef.current = null;
    }

    const sectionId = messageSectionIds.get(newUserMessage.id);
    if (sectionId) {
      setActiveSectionId(sectionId);
    }

    pinnedToBottomRef.current = false;
    pinnedPromptMessageIdRef.current = newUserMessage.id;

    const viewport = findScrollAreaViewport(scrollAreaRef.current);
    const spacerPx = Math.max(0, (viewport?.clientHeight ?? 0) - 12);
    setComposeViewportSpacerPx(spacerPx);

    let attempts = 0;
    const poll = () => {
      const pollViewport = findScrollAreaViewport(scrollAreaRef.current);
      if (!pollViewport) return;

      if (
        scrollViewportToMessage(
          pollViewport,
          newUserMessage.id,
          attempts === 0 ? "instant" : "smooth",
        )
      ) {
        return;
      }

      if (attempts++ < 40) {
        promptScrollTimerRef.current = setTimeout(poll, 50);
      }
    };

    requestAnimationFrame(() => requestAnimationFrame(poll));
  }, [isLive, messageSectionIds, page.messages]);

  useEffect(() => {
    if (isLive) return;
    pinnedPromptMessageIdRef.current = null;
    setComposeViewportSpacerPx(0);
  }, [isLive]);

  useEffect(() => {
    if (isStreaming) {
      wasStreamingRef.current = true;
      return;
    }
    if (!wasStreamingRef.current || !pinnedPromptMessageIdRef.current) return;
    wasStreamingRef.current = false;
    pinnedPromptMessageIdRef.current = null;
    setComposeViewportSpacerPx(0);
  }, [isStreaming]);

  useEffect(
    () => () => {
      if (promptScrollTimerRef.current) {
        clearTimeout(promptScrollTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!autoFollowLiveReply || !isLive) return;

    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
      "[data-radix-scroll-area-viewport]",
    );
    if (!viewport) return;

    const onScroll = () => {
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      pinnedToBottomRef.current = distanceFromBottom < 96;
    };

    onScroll();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [autoFollowLiveReply, isLive]);

  useEffect(() => {
    if (!autoFollowLiveReply || !isLive || !isStreaming) return;
    if (pinnedPromptMessageIdRef.current) return;
    if (lastMessage?.role !== "assistant") return;

    const viewport = findScrollAreaViewport(scrollAreaRef.current);
    if (!viewport) return;
    if (!pinnedToBottomRef.current) return;

    const frame = requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [
    autoFollowLiveReply,
    isLive,
    isStreaming,
    lastMessage?.id,
    lastMessage?.role,
    page.messages.length,
    streamingTextLength,
  ]);

  return (
    <article
      className={cn(
        "slide shrink-0 h-[min(2680px,calc(100%-25px))] max-w-[92vw] cursor-pointer snap-center outline-none",
        isFocused && "snap-always",
      )}
      style={{ width: `${widthPx}px` }}
      data-page-index={page.index}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onClick={onFocus}
      onFocus={onFocus}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onFocus?.();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Focus ${page.label}`}
    >
      <div
        className={cn(
          "relative flex h-full min-h-0 flex-col overflow-hidden rounded-[0px] border border-zinc-200/70 bg-white shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)] dark:border-zinc-800 dark:bg-zinc-900",
          isLive && !composerFocused && "ring-1 ring-blue-500/20",
          isFocused && !composerFocused && "ring-2 ring-blue-500/35",
        )}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(transparent_23px,#000_24px),linear-gradient(90deg,transparent_23px,#000_24px)] [background-size:24px_24px] dark:[background-image:linear-gradient(transparent_23px,#fff_24px),linear-gradient(90deg,transparent_23px,#fff_24px)]" />

        <div className="relative flex h-[48px] shrink-0 items-center justify-between border-b border-zinc-100 bg-gradient-to-b from-white/80 to-white/40 px-4 backdrop-blur-sm dark:border-zinc-800/80 dark:from-zinc-900/80 dark:to-zinc-900/40">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-white dark:text-zinc-900">
              {page.label}
            </span>
            <div
              role="group"
              aria-label="Page seal state"
              className="inline-flex shrink-0 rounded-md border border-zinc-200/80 bg-zinc-50/90 p-0.5 dark:border-zinc-700/80 dark:bg-zinc-800/70"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-pressed={!page.sealed}
                disabled={!page.sealed || !onSealChange}
                onClick={(event) => {
                  event.stopPropagation();
                  onSealChange?.(false);
                }}
                className={cn(
                  "rounded-[5px] px-2 py-0.5 text-[10px] font-medium transition",
                  !page.sealed
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-700 disabled:cursor-default disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200",
                )}
              >
                Open
              </button>
              <button
                type="button"
                aria-pressed={page.sealed}
                disabled={page.sealed || !canSeal || !onSealChange}
                onClick={(event) => {
                  event.stopPropagation();
                  onSealChange?.(true);
                }}
                className={cn(
                  "rounded-[5px] px-2 py-0.5 text-[10px] font-medium transition",
                  page.sealed
                    ? "bg-emerald-500/15 text-emerald-700 shadow-sm dark:text-emerald-300"
                    : "text-zinc-500 hover:text-zinc-700 disabled:cursor-default disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200",
                )}
              >
                Sealed
              </button>
            </div>
            {onLayoutModeChange ? (
              <PageCardLayoutModeControl
                value={layoutMode}
                onChange={onLayoutModeChange}
              />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            {isStreamingMessage && streamingDisplay?.showProgress ? (
              <StreamingProgressIndicator
                receivedChars={streamingTextLength}
                displayedChars={throttledStream.displayed.length}
                pendingChars={throttledStream.pendingChars}
                updateMode={streamUpdate.updateMode}
              />
            ) : null}
            {sections.length > 1 ? (
              <div onClick={(event) => event.stopPropagation()}>
                <Select
                  value={activeSectionId ?? sections[0].id}
                  onValueChange={(value) => {
                    setActiveSectionId(value);
                    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
                      "[data-radix-scroll-area-viewport]",
                    );
                    if (!viewport) return;

                    const target = viewport.querySelector<HTMLElement>(
                      `[data-section-id="${value}"]`,
                    );
                    if (!target) return;

                    viewport.scrollTo({
                      top: target.offsetTop,
                      behavior: "smooth",
                    });
                  }}
                >
                  <SelectTrigger
                    className="h-6 w-[170px] rounded-md border-zinc-200/80 bg-zinc-50/90 px-2 text-[11px] dark:border-zinc-700/80 dark:bg-zinc-800/70"
                    aria-label="Current prompt section"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {sections.map((section) => (
                      <SelectItem
                        key={section.id}
                        value={section.id}
                        className="max-w-[280px] text-[12px]"
                      >
                        {section.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {isFocused ? (
              <span className="shrink-0 rounded-md border border-zinc-200/80 bg-zinc-50/80 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:border-zinc-700/80 dark:bg-zinc-800/50 dark:text-zinc-400">
                <ScrollShortcutHint composerFocused={composerFocused} />
              </span>
            ) : null}
            <span className="text-[11px] text-zinc-500">
              {formatCountLabel(
                countItems(page.messages, DEFAULT_COUNTING_TYPE),
                DEFAULT_COUNTING_TYPE,
              )}
            </span>
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span className="text-[11px] text-zinc-500">
              ~{(page.tokenEstimate / 1000).toFixed(1)}k
            </span>
            {onDelete ||
            onNewPage ||
            onMoveToNewChat ||
            onMovePageLeft ||
            onMovePageRight ? (
              <div onClick={(event) => event.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${page.label} options`}
                      disabled={
                        !canDelete &&
                        !canNewPage &&
                        !canMoveToNewChat &&
                        !canMovePageLeft &&
                        !canMovePageRight
                      }
                      className="h-7 w-7 shrink-0 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[12rem]">
                    {onMovePageLeft ? (
                      <DropdownMenuItem
                        disabled={!canMovePageLeft}
                        className="gap-2 text-[13px]"
                        onSelect={() => onMovePageLeft()}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Move page to left
                      </DropdownMenuItem>
                    ) : null}
                    {onMovePageRight ? (
                      <DropdownMenuItem
                        disabled={!canMovePageRight}
                        className="gap-2 text-[13px]"
                        onSelect={() => onMovePageRight()}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        Move page to right
                      </DropdownMenuItem>
                    ) : null}
                    {onNewPage ? (
                      <DropdownMenuItem
                        disabled={!canNewPage}
                        className="gap-2 text-[13px]"
                        onSelect={() => onNewPage()}
                      >
                        <LayoutTemplate className="h-3.5 w-3.5" />
                        New Page
                      </DropdownMenuItem>
                    ) : null}
                    {onMoveToNewChat ? (
                      <DropdownMenuItem
                        disabled={!canMoveToNewChat}
                        className="gap-2 text-[13px]"
                        onSelect={() => onMoveToNewChat()}
                      >
                        <ArrowRightFromLine className="h-3.5 w-3.5" />
                        Move Page to New Chat
                      </DropdownMenuItem>
                    ) : null}
                    {onDelete ? (
                      <DropdownMenuItem
                        disabled={!canDelete}
                        className="gap-2 text-[13px] text-red-600 focus:bg-red-50 focus:text-red-600 dark:text-red-400 dark:focus:bg-red-950/40 dark:focus:text-red-400"
                        onSelect={() => onDelete()}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete page
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative min-h-0 flex-1 px-4 pb-5 pt-4 md:px-5">
          <ScrollArea ref={scrollAreaRef} className="h-full min-h-0">
            <PageSlugPlanProvider
              page={page}
              streamingMessageId={
                isStreamingMessage ? streamingMessageId : undefined
              }
            >
            <div className="space-y-3.5 pr-3">
              {page.messages.map((msg, messageIndex) => {
                const sectionId = messageSectionIds.get(msg.id);
                const messageProps = {
                  columnCount:
                    msg.role === "assistant"
                      ? streamingDisplay?.renderMode === "streamdown"
                        ? 1
                        : columnCount
                      : undefined,
                  fontScale,
                  lineHeight,
                  streaming: isStreaming && msg.id === streamingMessageId,
                  animate: msg.id !== streamingMessageId,
                  displayText:
                    msg.id === streamingMessageId
                      ? throttledStream.displayed
                      : undefined,
                  streamRenderMode: streamingDisplay?.renderMode,
                  containedReplyScroll,
                  containedReplyMaxHeightPx,
                } as const;

                if (msg.role === "user") {
                  const qaMenuEnabled = !page.sealed;
                  const canMoveQaToNewPage =
                    qaMenuEnabled && canMoveQaToNewPageOnPage(page, msg.id);
                  const canMoveQaAndBeneath =
                    qaMenuEnabled &&
                    canMoveQaAndBeneathToNewPageOnPage(page, msg.id);

                  return (
                    <div
                      key={msg.id}
                      data-message-id={msg.id}
                      data-section-id={sectionId}
                      className="flex items-start justify-end gap-0.5"
                    >
                      {onDeleteQa ||
                      onMoveQaToNewPage ||
                      onMoveQaAndBeneathToNewPage ? (
                        <div
                          className="mt-1 shrink-0"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Prompt options"
                                disabled={
                                  !qaMenuEnabled &&
                                  !canMoveQaToNewPage &&
                                  !canMoveQaAndBeneath
                                }
                                className="h-6 w-6 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="min-w-[14rem]"
                            >
                              {onMoveQaToNewPage ? (
                                <DropdownMenuItem
                                  disabled={!canMoveQaToNewPage}
                                  className="gap-2 text-[13px]"
                                  onSelect={() => onMoveQaToNewPage(msg.id)}
                                >
                                  <SplitSquareHorizontal className="h-3.5 w-3.5" />
                                  Move to New Page
                                </DropdownMenuItem>
                              ) : null}
                              {onMoveQaAndBeneathToNewPage ? (
                                <DropdownMenuItem
                                  disabled={!canMoveQaAndBeneath}
                                  className="gap-2 text-[13px]"
                                  onSelect={() =>
                                    onMoveQaAndBeneathToNewPage(msg.id)
                                  }
                                >
                                  <SplitSquareHorizontal className="h-3.5 w-3.5" />
                                  Move This And Beneath To New Page
                                </DropdownMenuItem>
                              ) : null}
                              {onDeleteQa ? (
                                <DropdownMenuItem
                                  disabled={!qaMenuEnabled}
                                  className="gap-2 text-[13px] text-red-600 focus:bg-red-50 focus:text-red-600 dark:text-red-400 dark:focus:bg-red-950/40 dark:focus:text-red-400"
                                  onSelect={() => onDeleteQa(msg.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete Q&A
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ) : null}
                      <div className="min-w-0 max-w-full">
                        <MessageBubble message={msg} {...messageProps} />
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    data-message-id={msg.id}
                    data-section-id={sectionId}
                  >
                    <MessageBubble message={msg} {...messageProps} />
                  </div>
                );
              })}
              {showTypingIndicator ? (
                <div className="flex justify-start">
                  <div className="rounded-[18px] rounded-bl-[5px] border border-zinc-200/70 bg-zinc-100 px-3.5 py-2.5 dark:border-zinc-700/50 dark:bg-zinc-800">
                    <div className="typing text-zinc-500">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              ) : null}
              {composeViewportSpacerPx > 0 ? (
                <div
                  aria-hidden
                  className="pointer-events-none shrink-0"
                  style={{ minHeight: `${composeViewportSpacerPx}px` }}
                />
              ) : null}
            </div>
            </PageSlugPlanProvider>
          </ScrollArea>
          <div className="pointer-events-none absolute bottom-0 left-0 right-3 h-8 bg-gradient-to-t from-white to-transparent dark:from-zinc-900" />
        </div>
      </div>
    </article>
  );
}, (prev, next) => {
  if (next.isLive || next.isStreaming || next.page.sealed !== prev.page.sealed) {
    return false;
  }

  const prevLast = prev.page.messages[prev.page.messages.length - 1];
  const nextLast = next.page.messages[next.page.messages.length - 1];

  return (
    prev.page.index === next.page.index &&
    prev.page.sealed === next.page.sealed &&
    prev.page.messages.length === next.page.messages.length &&
    prevLast?.id === nextLast?.id &&
    prev.widthPx === next.widthPx &&
    prev.columnCount === next.columnCount &&
    prev.fontScale === next.fontScale &&
    prev.lineHeight === next.lineHeight &&
    prev.isFocused === next.isFocused &&
    prev.composerFocused === next.composerFocused &&
    prev.autoFollowLiveReply === next.autoFollowLiveReply &&
    prev.canSeal === next.canSeal &&
    prev.onSealChange === next.onSealChange &&
    prev.canDelete === next.canDelete &&
    prev.onDelete === next.onDelete &&
    prev.canNewPage === next.canNewPage &&
    prev.onNewPage === next.onNewPage &&
    prev.canMoveToNewChat === next.canMoveToNewChat &&
    prev.onMoveToNewChat === next.onMoveToNewChat &&
    prev.canMovePageLeft === next.canMovePageLeft &&
    prev.onMovePageLeft === next.onMovePageLeft &&
    prev.canMovePageRight === next.canMovePageRight &&
    prev.onMovePageRight === next.onMovePageRight &&
    prev.onDeleteQa === next.onDeleteQa &&
    prev.onMoveQaToNewPage === next.onMoveQaToNewPage &&
    prev.onMoveQaAndBeneathToNewPage === next.onMoveQaAndBeneathToNewPage &&
    prev.streamingDisplay === next.streamingDisplay &&
    prev.layoutMode === next.layoutMode &&
    prev.onLayoutModeChange === next.onLayoutModeChange
  );
});