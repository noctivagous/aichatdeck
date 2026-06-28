"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import type { PageColumnCount } from "@/lib/page-columns";
import {
  REPLY_FONT_SCALE,
  replyFontEffectivePx,
  type ReplyFontScaleId,
} from "@/lib/reply-font-size";
import {
  REPLY_LINE_HEIGHT,
  replyLineHeightValue,
  type ReplyLineHeightId,
} from "@/lib/reply-line-height";
import { segmentMarkdownForColumns } from "@/lib/markdown-column-segments";
import { rehypeMarkdownPolish } from "@/lib/rehype-markdown-polish";
import { rehypeTableTitles } from "@/lib/rehype-table-titles";
import { markdownComponents } from "./markdown-components";
import "katex/dist/katex.min.css";

type MarkdownReplyProps = {
  content: string;
  columnCount?: PageColumnCount;
  fontScale?: ReplyFontScaleId;
  lineHeight?: ReplyLineHeightId;
  streaming?: boolean;
};

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS_COMPLETE = [
  rehypeKatex,
  rehypeMarkdownPolish,
  rehypeTableTitles,
];
const REHYPE_PLUGINS_STREAMING = [rehypeMarkdownPolish, rehypeTableTitles];

export function MarkdownReply({
  content,
  columnCount = 1,
  fontScale = REPLY_FONT_SCALE.default,
  lineHeight = REPLY_LINE_HEIGHT.default,
  streaming = false,
}: MarkdownReplyProps) {
  const effectiveFontPx = replyFontEffectivePx(fontScale);
  const useColumns = columnCount > 1 && !streaming;
  const segments = useMemo(
    () => (useColumns ? segmentMarkdownForColumns(content) : null),
    [content, useColumns],
  );

  const bodyStyle = {
    fontSize: `${effectiveFontPx}px`,
    lineHeight: replyLineHeightValue(lineHeight),
  } satisfies CSSProperties;

  const wrapperClass = cn(
    "markdown-body",
    streaming && "markdown-body-streaming",
  );
  const rehypePlugins = streaming
    ? REHYPE_PLUGINS_STREAMING
    : REHYPE_PLUGINS_COMPLETE;

  const columnStyle = {
    columnCount,
    columnGap: "1.25rem",
    columnFill: "balance",
    width: "100%",
  } satisfies CSSProperties;

  const renderMarkdown = (text: string, key: string) => (
    <ReactMarkdown
      key={key}
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={rehypePlugins}
      components={markdownComponents}
    >
      {text}
    </ReactMarkdown>
  );

  const streamingCursor = streaming ? (
    <span className="streaming-cursor" aria-hidden />
  ) : null;

  if (!useColumns || !segments || segments.length === 0) {
    return (
      <div className={wrapperClass} style={bodyStyle}>
        {renderMarkdown(content, streaming ? "stream" : "single")}
        {streamingCursor}
      </div>
    );
  }

  return (
    <div className={wrapperClass} style={bodyStyle}>
      {segments.map((segment, index) => {
        if (segment.kind === "block") {
          return (
            <div
              key={`block-${index}`}
              className="markdown-full-width-block w-full"
            >
              {renderMarkdown(segment.text, `block-${index}`)}
            </div>
          );
        }

        return (
          <div
            key={`flow-${index}`}
            className={cn(
              "markdown-col-region",
              columnCount === 2 && "markdown-col-region-2",
              columnCount === 3 && "markdown-col-region-3",
            )}
            style={columnStyle}
          >
            {renderMarkdown(segment.text, `flow-${index}`)}
          </div>
        );
      })}
      {streamingCursor}
    </div>
  );
}