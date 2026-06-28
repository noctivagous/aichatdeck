"use client";

import { memo, useEffect, useRef } from "react";
import type { PageView } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { PageColumnCount } from "@/lib/page-columns";
import type { ReplyFontScaleId } from "@/lib/reply-font-size";
import type { ReplyLineHeightId } from "@/lib/reply-line-height";
import { messageText } from "@/lib/tokens";

type PageCardProps = {
  page: PageView;
  isLive: boolean;
  isFocused?: boolean;
  isStreaming: boolean;
  streamingMessageId?: string;
  widthPx: number;
  columnCount: PageColumnCount;
  fontScale: ReplyFontScaleId;
  lineHeight: ReplyLineHeightId;
  onFocus?: () => void;
};

export const PageCard = memo(function PageCard({
  page,
  isLive,
  isFocused = false,
  isStreaming,
  streamingMessageId,
  widthPx,
  columnCount,
  fontScale,
  lineHeight,
  onFocus,
}: PageCardProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);

  const lastMessage = page.messages[page.messages.length - 1];
  const streamingMessage = streamingMessageId
    ? page.messages.find((message) => message.id === streamingMessageId)
    : undefined;
  const streamingTextLength = streamingMessage
    ? messageText(streamingMessage).length
    : 0;

  const showTypingIndicator =
    isLive &&
    isStreaming &&
    (!lastMessage || lastMessage.role !== "assistant");

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!isLive) return;

    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
      "[data-radix-scroll-area-viewport]",
    );
    if (!viewport) return;

    if (!pinnedToBottomRef.current) return;

    const frame = requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });

    return () => cancelAnimationFrame(frame);
  }, [isLive, page.messages.length, streamingTextLength]);

  return (
    <article
      className={cn(
        "slide shrink-0 h-[min(680px,calc(100%-16px))] max-w-[92vw] cursor-pointer snap-center",
        isFocused && "snap-always",
      )}
      style={{ width: `${widthPx}px` }}
      onClick={onFocus}
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
          "relative flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-zinc-200/70 bg-white shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)] dark:border-zinc-800 dark:bg-zinc-900",
          isLive && "ring-1 ring-blue-500/20",
          isFocused && "ring-2 ring-blue-500/35",
        )}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(transparent_23px,#000_24px),linear-gradient(90deg,transparent_23px,#000_24px)] [background-size:24px_24px] dark:[background-image:linear-gradient(transparent_23px,#fff_24px),linear-gradient(90deg,transparent_23px,#fff_24px)]" />

        <div className="relative flex h-[48px] shrink-0 items-center justify-between border-b border-zinc-100 bg-gradient-to-b from-white/80 to-white/40 px-4 backdrop-blur-sm dark:border-zinc-800/80 dark:from-zinc-900/80 dark:to-zinc-900/40">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-white dark:text-zinc-900">
              {page.label}
            </span>
            <span className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              {page.sealed ? "Sealed" : "Live now"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="text-[11px] text-zinc-500">
              {page.messages.length} msgs
            </span>
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span className="text-[11px] text-zinc-500">
              ~{(page.tokenEstimate / 1000).toFixed(1)}k
            </span>
            {page.sealed ? (
              <div
                className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/10 text-emerald-600"
                title="Page sealed"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative min-h-0 flex-1 px-4 pb-5 pt-4 md:px-5">
          <ScrollArea ref={scrollAreaRef} className="h-full min-h-0">
            <div className="space-y-3.5 pr-3">
              {page.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  columnCount={
                    msg.role === "assistant" ? columnCount : undefined
                  }
                  fontScale={fontScale}
                  lineHeight={lineHeight}
                  streaming={isStreaming && msg.id === streamingMessageId}
                  animate={msg.id !== streamingMessageId}
                />
              ))}
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
            </div>
          </ScrollArea>
          <div className="pointer-events-none absolute bottom-0 left-0 right-3 h-8 bg-gradient-to-t from-white to-transparent dark:from-zinc-900" />
        </div>
      </div>
    </article>
  );
}, (prev, next) => {
  if (next.isLive || next.isStreaming) return false;

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
    prev.isFocused === next.isFocused
  );
});