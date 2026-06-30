"use client";

import type { Components } from "react-markdown";

function OutlineHeading({
  level,
  className,
  children,
  ...props
}: React.ComponentProps<"h1"> & { level: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

  return (
    <Tag className={className} {...props}>
      {children}
    </Tag>
  );
}

export const markdownComponents: Components = {
  h1: ({ node: _node, className, children, ...props }) => (
    <OutlineHeading level={1} className={className} {...props}>
      {children}
    </OutlineHeading>
  ),
  h2: ({ node: _node, className, children, ...props }) => (
    <OutlineHeading level={2} className={className} {...props}>
      {children}
    </OutlineHeading>
  ),
  h3: ({ node: _node, className, children, ...props }) => (
    <OutlineHeading level={3} className={className} {...props}>
      {children}
    </OutlineHeading>
  ),
  h4: ({ node: _node, className, children, ...props }) => (
    <OutlineHeading level={4} className={className} {...props}>
      {children}
    </OutlineHeading>
  ),
  h5: ({ node: _node, className, children, ...props }) => (
    <OutlineHeading level={5} className={className} {...props}>
      {children}
    </OutlineHeading>
  ),
  h6: ({ node: _node, className, children, ...props }) => (
    <OutlineHeading level={6} className={className} {...props}>
      {children}
    </OutlineHeading>
  ),
  table: ({ children, node: _node, ...props }) => (
    <div className="markdown-table-scroll">
      <table className="markdown-table" {...props}>
        {children}
      </table>
    </div>
  ),
  a: ({ children, node: _node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};