import type { Components } from "react-markdown";

export const markdownComponents: Components = {
  h1: ({ node: _node, className, ...props }) => (
    <h1 className={className} {...props} />
  ),
  h2: ({ node: _node, className, ...props }) => (
    <h2 className={className} {...props} />
  ),
  h3: ({ node: _node, className, ...props }) => (
    <h3 className={className} {...props} />
  ),
  h4: ({ node: _node, className, ...props }) => (
    <h4 className={className} {...props} />
  ),
  h5: ({ node: _node, className, ...props }) => (
    <h5 className={className} {...props} />
  ),
  h6: ({ node: _node, className, ...props }) => (
    <h6 className={className} {...props} />
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