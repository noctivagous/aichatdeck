"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { PluggableList } from "unified";
import { markdownComponents } from "./markdown-components";

type MdNode = {
  type?: string;
  depth?: number;
  data?: {
    hProperties?: Record<string, unknown>;
  };
  children?: MdNode[];
};

export function withHeadingSlugs(slugs: string[], slugOffset = 0) {
  return function headingSlugPlugin() {
    return function transform(tree: MdNode) {
      let headingIndex = 0;

      const walk = (node: MdNode) => {
        if (
          node.type === "heading" &&
          (node.depth ?? 0) >= 1 &&
          (node.depth ?? 0) <= 3
        ) {
          const slug = slugs[slugOffset + headingIndex];
          headingIndex += 1;
          if (slug) {
            node.data = {
              ...node.data,
              hProperties: {
                ...(node.data?.hProperties ?? {}),
                id: slug,
                "data-heading-slug": slug,
              },
            };
          }
        }

        for (const child of node.children ?? []) {
          walk(child);
        }
      };

      walk(tree);
    };
  };
}

type MemoizedMarkdownBlockProps = {
  content: string;
  blockIndex: number;
  remarkPlugins: PluggableList;
  rehypePlugins: PluggableList;
  headingSlugs: string[];
  slugOffset: number;
};

function MarkdownBlock({
  content,
  remarkPlugins,
  rehypePlugins,
  headingSlugs,
  slugOffset,
}: MemoizedMarkdownBlockProps) {
  const plugins = useMemo(
    () => [...remarkPlugins, withHeadingSlugs(headingSlugs, slugOffset)],
    [remarkPlugins, headingSlugs, slugOffset],
  );

  return (
    <ReactMarkdown
      remarkPlugins={plugins}
      rehypePlugins={rehypePlugins}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}

export const MemoizedMarkdownBlock = memo(
  MarkdownBlock,
  (prev, next) => prev.content === next.content,
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";