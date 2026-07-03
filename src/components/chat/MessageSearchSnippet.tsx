"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { rehypeMarkdownPolish } from "@/lib/rehype-markdown-polish";
import { markdownComponents } from "./markdown-components";

type MessageSearchSnippetProps = {
  content: string;
  className?: string;
};

const snippetComponents: Components = {
  ...markdownComponents,
  a: ({ children, node: _node, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  ),
};

export function MessageSearchSnippet({
  content,
  className,
}: MessageSearchSnippetProps) {
  return (
    <div className={cn("markdown-body markdown-snippet min-w-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeMarkdownPolish]}
        components={snippetComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}