"use client";

import { useMemo, useRef } from "react";
import type { ComponentProps, CSSProperties } from "react";
import { Streamdown, type Components } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { cn } from "@/lib/utils";
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
import { useMessageHeadingSlugs } from "./heading-slug-context";

type StreamdownReplyProps = {
  content: string;
  fontScale?: ReplyFontScaleId;
  lineHeight?: ReplyLineHeightId;
  streaming?: boolean;
};

function OutlineHeading({
  level,
  className,
  children,
  slug,
  ...props
}: ComponentProps<"h1"> & {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  slug?: string;
}) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

  return (
    <Tag
      className={className}
      id={slug}
      data-heading-slug={slug}
      {...props}
    >
      {children}
    </Tag>
  );
}

const STREAMDOWN_PLUGINS = { code, math, mermaid };

export function StreamdownReply({
  content,
  fontScale = REPLY_FONT_SCALE.default,
  lineHeight = REPLY_LINE_HEIGHT.default,
  streaming = false,
}: StreamdownReplyProps) {
  const headingSlugs = useMessageHeadingSlugs();
  const headingIndexRef = useRef(0);
  headingIndexRef.current = 0;

  const components = useMemo((): Components => {
    const nextSlug = () => headingSlugs[headingIndexRef.current++] ?? undefined;

    return {
      h1: ({ className, children, ...props }) => (
        <OutlineHeading level={1} className={className} slug={nextSlug()} {...props}>
          {children}
        </OutlineHeading>
      ),
      h2: ({ className, children, ...props }) => (
        <OutlineHeading level={2} className={className} slug={nextSlug()} {...props}>
          {children}
        </OutlineHeading>
      ),
      h3: ({ className, children, ...props }) => (
        <OutlineHeading level={3} className={className} slug={nextSlug()} {...props}>
          {children}
        </OutlineHeading>
      ),
      table: ({ children, ...props }) => (
        <div className="markdown-table-scroll">
          <table className="markdown-table" {...props}>
            {children}
          </table>
        </div>
      ),
      a: ({ children, ...props }) => (
        <a {...props} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ),
    };
  }, [headingSlugs]);

  const bodyStyle = {
    fontSize: `${replyFontEffectivePx(fontScale)}px`,
    lineHeight: replyLineHeightValue(lineHeight),
  } satisfies CSSProperties;

  return (
    <div
      className={cn("markdown-body", streaming && "markdown-body-streaming")}
      style={bodyStyle}
    >
      <Streamdown
        isAnimating={streaming}
        animated={streaming}
        mode={streaming ? "streaming" : "static"}
        parseIncompleteMarkdown={streaming}
        components={components}
        plugins={STREAMDOWN_PLUGINS}
      >
        {content}
      </Streamdown>
    </div>
  );
}