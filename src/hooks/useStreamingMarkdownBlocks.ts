"use client";

import { useMemo, useRef } from "react";
import {
  countMarkdownHeadings,
  type MarkdownBlockSplitState,
  splitMarkdownIntoBlocks,
  splitMarkdownIntoBlocksStreaming,
} from "@/lib/markdown-blocks";
import { repairStreamingMarkdown } from "@/lib/repair-streaming-markdown";
import { logStreamingDebug } from "@/lib/streaming-debug";

const EMPTY_STATE: MarkdownBlockSplitState = {
  source: "",
  blocks: [],
  headingCounts: [],
};

export function useStreamingMarkdownBlocks(content: string, streaming: boolean) {
  const splitStateRef = useRef<MarkdownBlockSplitState>(EMPTY_STATE);
  const rawSourceRef = useRef("");

  return useMemo(() => {
    if (!streaming) {
      if (
        rawSourceRef.current === content &&
        splitStateRef.current.blocks.length > 0
      ) {
        return splitStateRef.current;
      }

      if (!content) {
        splitStateRef.current = EMPTY_STATE;
        return EMPTY_STATE;
      }

      const blocks = splitMarkdownIntoBlocks(content);
      const next = {
        source: content,
        blocks,
        headingCounts: blocks.map((block) => countMarkdownHeadings(block)),
      };
      splitStateRef.current = next;
      rawSourceRef.current = content;
      return next;
    }

    rawSourceRef.current = content;
    const startedAt = performance.now();
    const repaired = repairStreamingMarkdown(content);
    const previous =
      splitStateRef.current.source.length > 0 ? splitStateRef.current : null;
    const next = splitMarkdownIntoBlocksStreaming(repaired, previous);
    const durationMs = performance.now() - startedAt;
    if (durationMs >= 6) {
      logStreamingDebug({
        source: "useStreamingMarkdownBlocks",
        event: "split",
        durationMs,
        meta: {
          contentChars: content.length,
          repairedChars: repaired.length,
          blockCount: next.blocks.length,
          appendedChars: Math.max(
            0,
            content.length - (previous?.source.length ?? 0),
          ),
        },
      });
    }
    splitStateRef.current = next;
    return next;
  }, [content, streaming]);
}