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
import { buildBlockSlugOffsets } from "@/lib/markdown-blocks";
import { rehypeMarkdownPolish } from "@/lib/rehype-markdown-polish";
import { rehypeTableTitles } from "@/lib/rehype-table-titles";
import { useStreamingMarkdownBlocks } from "@/hooks/useStreamingMarkdownBlocks";
import { markdownComponents } from "./markdown-components";
import { useMessageHeadingSlugs } from "./heading-slug-context";
import {
  MemoizedMarkdownBlock,
  withHeadingSlugs,
} from "./MemoizedMarkdownBlock";

type MarkdownReplyProps = {
  content: string;
  columnCount?: PageColumnCount;
  fontScale?: ReplyFontScaleId;
  lineHeight?: ReplyLineHeightId;
  streaming?: boolean;
};

const MARKDOWN_REMARK_PLUGINS_BASE = [remarkGfm, remarkMath];
const MARKDOWN_REHYPE_PLUGINS = [
  rehypeKatex,
  rehypeMarkdownPolish,
  rehypeTableTitles,
];

export function MarkdownReply({
  content,
  columnCount = 1,
  fontScale = REPLY_FONT_SCALE.default,
  lineHeight = REPLY_LINE_HEIGHT.default,
  streaming = false,
}: MarkdownReplyProps) {
  const headingSlugs = useMessageHeadingSlugs();
  const remarkPlugins = useMemo(
    () => [remarkGfm, remarkMath, withHeadingSlugs(headingSlugs)],
    [headingSlugs],
  );
  const effectiveFontPx = replyFontEffectivePx(fontScale);
  const useColumns = columnCount > 1 && !streaming;
  const segments = useMemo(
    () => (useColumns ? segmentMarkdownForColumns(content) : null),
    [content, useColumns],
  );
  const markdownSplit = useStreamingMarkdownBlocks(content, streaming);
  const blockSlugOffsets = useMemo(
    () =>
      buildBlockSlugOffsets(
        markdownSplit.blocks,
        markdownSplit.headingCounts,
      ),
    [markdownSplit.blocks, markdownSplit.headingCounts],
  );

  const bodyStyle = {
    fontSize: `${effectiveFontPx}px`,
    lineHeight: replyLineHeightValue(lineHeight),
  } satisfies CSSProperties;

  const wrapperClass = cn(
    "markdown-body",
    streaming && "markdown-body-streaming",
  );

  const columnStyle = {
    columnCount,
    columnGap: "1.25rem",
    columnFill: "balance",
    width: "100%",
  } satisfies CSSProperties;

  const renderMarkdown = (text: string, key: string) => (
    <ReactMarkdown
      key={key}
      remarkPlugins={remarkPlugins}
      rehypePlugins={MARKDOWN_REHYPE_PLUGINS}
      components={markdownComponents}
    >
      {text}
    </ReactMarkdown>
  );

  const streamingCursor = streaming ? (
    <span className="streaming-cursor" aria-hidden />
  ) : null;

  if (!useColumns) {
    return (
      <div className={wrapperClass} style={bodyStyle}>
        {markdownSplit.blocks.map((block, index) => (
          <MemoizedMarkdownBlock
            key={`block-${index}`}
            blockIndex={index}
            content={block}
            remarkPlugins={MARKDOWN_REMARK_PLUGINS_BASE}
            rehypePlugins={MARKDOWN_REHYPE_PLUGINS}
            headingSlugs={headingSlugs}
            slugOffset={blockSlugOffsets[index] ?? 0}
          />
        ))}
        {streamingCursor}
      </div>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <div className={wrapperClass} style={bodyStyle}>
        {renderMarkdown(content, "single")}
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