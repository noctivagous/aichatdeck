"use client";

import { useMemo, useRef } from "react";
import {
  type MarkdownBlockSplitState,
  splitMarkdownIntoBlocksStreaming,
} from "@/lib/markdown-blocks";
import { repairStreamingMarkdown } from "@/lib/repair-streaming-markdown";

const EMPTY_STATE: MarkdownBlockSplitState = {
  source: "",
  blocks: [],
  headingCounts: [],
};

export function useStreamingMarkdownBlocks(content: string, streaming: boolean) {
  const splitStateRef = useRef<MarkdownBlockSplitState>(EMPTY_STATE);

  return useMemo(() => {
    if (!streaming) {
      splitStateRef.current = EMPTY_STATE;
      return EMPTY_STATE;
    }

    const repaired = repairStreamingMarkdown(content);
    const previous =
      splitStateRef.current.source.length > 0 ? splitStateRef.current : null;
    const next = splitMarkdownIntoBlocksStreaming(repaired, previous);
    splitStateRef.current = next;
    return next;
  }, [content, streaming]);
}