"use client";

import { memo } from "react";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { clampPageColumns, type PageColumnCount } from "@/lib/page-columns";
import {
  REPLY_FONT_SCALE,
  type ReplyFontScaleId,
} from "@/lib/reply-font-size";
import {
  REPLY_LINE_HEIGHT,
  type ReplyLineHeightId,
} from "@/lib/reply-line-height";
import { MarkdownReply } from "./MarkdownReply";
import { AssistantMessageSlugProvider } from "./heading-slug-context";

type MessageBubbleProps = {
  message: UIMessage;
  animate?: boolean;
  columnCount?: PageColumnCount;
  fontScale?: ReplyFontScaleId;
  lineHeight?: ReplyLineHeightId;
  streaming?: boolean;
};

export const MessageBubble = memo(function MessageBubble({
  message,
  animate = true,
  columnCount = 1,
  fontScale = REPLY_FONT_SCALE.default,
  lineHeight = REPLY_LINE_HEIGHT.default,
  streaming = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const columns = clampPageColumns(columnCount);

  const bubble = (
      <div
        className={cn(
          "px-3.5 py-2.5",
          isUser ? "max-w-[88%]" : "w-full max-w-full",
          isUser
            ? "rounded-[18px] rounded-br-[5px] bg-blue-600 text-white shadow-[0_6px_18px_-8px_rgba(37,99,235,0.55)]"
            : "rounded-[18px] rounded-bl-[5px] border border-zinc-200/70 bg-zinc-100 text-zinc-900 dark:border-zinc-700/50 dark:bg-zinc-800 dark:text-zinc-100",
        )}
      >
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            return isUser ? (
              <p
                key={index}
                className="whitespace-pre-wrap text-[14px] leading-[1.5]"
              >
                {part.text}
              </p>
            ) : (
              <MarkdownReply
                key={`${index}-${columns}`}
                content={part.text}
                columnCount={columns}
                fontScale={fontScale}
                lineHeight={lineHeight}
                streaming={streaming}
              />
            );
          }

          if (part.type === "file" && part.mediaType?.startsWith("image/")) {
            return (
              <figure
                key={index}
                className="mt-2.5 overflow-hidden rounded-xl bg-zinc-900"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={part.url}
                  alt={part.filename ?? "attachment"}
                  className="h-[150px] w-full object-cover"
                />
                {part.filename ? (
                  <figcaption className="px-2 py-1.5 text-[11px] text-zinc-300">
                    {part.filename}
                  </figcaption>
                ) : null}
              </figure>
            );
          }

          return null;
        })}
      </div>
  );

  return (
    <div
      className={cn(
        "flex",
        isUser ? "justify-end" : "justify-start",
        animate && !streaming && "bubble",
      )}
    >
      {isUser ? (
        bubble
      ) : (
        <AssistantMessageSlugProvider messageId={message.id}>
          {bubble}
        </AssistantMessageSlugProvider>
      )}
    </div>
  );
});