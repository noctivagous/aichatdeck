function isInsideCodeFence(text: string): boolean {
  let fenceCount = 0;
  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      fenceCount += 1;
    }
  }
  return fenceCount % 2 === 1;
}

function closeUnclosedBold(text: string): string {
  const matches = text.match(/\*\*/g);
  if (!matches || matches.length % 2 === 0) return text;
  return `${text}**`;
}

function closeUnclosedInlineCode(text: string): string {
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "`") continue;
    const prev = text[index - 1];
    const next = text[index + 1];
    if (prev === "`" || next === "`") continue;
    count += 1;
  }
  if (count % 2 === 0) return text;
  return `${text}\``;
}

function closeUnclosedLink(text: string): string {
  const lastOpen = text.lastIndexOf("[");
  if (lastOpen < 0) return text;

  const tail = text.slice(lastOpen);
  if (!/^\[[^\]]*$/.test(tail)) return text;
  return `${text}](stream)`;
}

/** Temporarily close incomplete markdown syntax for streaming renders. */
export function repairStreamingMarkdown(text: string): string {
  if (!text) return text;

  if (isInsideCodeFence(text)) {
    return `${text}\n\`\`\``;
  }

  let result = text;
  result = closeUnclosedBold(result);
  result = closeUnclosedInlineCode(result);
  result = closeUnclosedLink(result);
  return result;
}