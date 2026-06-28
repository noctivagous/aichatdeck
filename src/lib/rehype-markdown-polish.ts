type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const PULL_QUOTE_RE =
  /^(in short|summary|tl;dr|to summarize|in summary)\b[:.]?\s*/i;

const KEY_TERM_SEPARATOR_RE = /^[—–-]\s*/;

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

function nodeText(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(nodeText).join("");
}

function firstElementChild(node: HastNode): HastNode | undefined {
  return (node.children ?? []).find((child) => isElement(child));
}

function isBoldOnlyParagraph(node: HastNode): boolean {
  if (!isElement(node) || node.tagName !== "p") return false;
  const children = node.children ?? [];
  if (children.length !== 1) return false;
  const child = children[0];
  return isElement(child) && child.tagName === "strong";
}

function isPullQuoteParagraph(node: HastNode): boolean {
  if (!isElement(node) || node.tagName !== "p") return false;
  const text = nodeText(node).trim();
  if (PULL_QUOTE_RE.test(text)) return true;

  const first = firstElementChild(node);
  if (first && isElement(first) && first.tagName === "strong") {
    return PULL_QUOTE_RE.test(nodeText(first).trim());
  }

  return false;
}

function isKeyTermListItem(node: HastNode): boolean {
  if (!isElement(node) || node.tagName !== "li") return false;

  const first = firstElementChild(node);
  if (!first || !isElement(first)) return false;

  if (first.tagName === "p") {
    const paragraphChild = firstElementChild(first);
    if (!paragraphChild || !isElement(paragraphChild)) return false;
    if (paragraphChild.tagName !== "strong") return false;

    const text = nodeText(first).trim();
    const strongText = nodeText(paragraphChild).trim();
    const remainder = text.slice(strongText.length).trim();
    return KEY_TERM_SEPARATOR_RE.test(remainder);
  }

  if (first.tagName === "strong") {
    const text = nodeText(node).trim();
    const strongText = nodeText(first).trim();
    const remainder = text.slice(strongText.length).trim();
    return KEY_TERM_SEPARATOR_RE.test(remainder);
  }

  return false;
}

export function rehypeMarkdownPolish() {
  return function transformer(tree: HastNode | undefined) {
    if (!tree) return;

    const walk = (parent: HastNode) => {
      const children = parent.children ?? [];

      for (const child of children) {
        if (!isElement(child)) continue;

        if (isBoldOnlyParagraph(child)) {
          appendClassName(child, "markdown-doc-title");
        }

        if (isPullQuoteParagraph(child)) {
          appendClassName(child, "markdown-pull-quote");
        }

        if (isKeyTermListItem(child)) {
          appendClassName(child, "markdown-key-term");
        }

        walk(child);
      }
    };

    walk(tree);
  };
}