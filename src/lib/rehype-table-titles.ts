type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function isElement(node: HastNode): node is HastNode & { tagName: string } {
  return node.type === "element" && typeof node.tagName === "string";
}

function appendClassName(node: HastNode, className: string) {
  const existing = node.properties?.className;
  const classes = Array.isArray(existing)
    ? existing.map(String)
    : typeof existing === "string"
      ? existing.split(" ").filter(Boolean)
      : [];

  node.properties = {
    ...node.properties,
    className: [...classes, className],
  };
}

export function rehypeTableTitles() {
  return function transformer(tree: HastNode | undefined) {
    if (!tree) return;

    const walk = (parent: HastNode) => {
      const children = parent.children ?? [];

      for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        if (!isElement(child)) continue;

        if (/^h[1-6]$/.test(child.tagName)) {
          const next = children[index + 1];
          if (next && isElement(next) && next.tagName === "table") {
            appendClassName(child, "markdown-table-title");
          }
        }

        walk(child);
      }
    };

    walk(tree);
  };
}