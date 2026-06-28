"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadReplyLineHeight,
  REPLY_LINE_HEIGHT,
  saveReplyLineHeight,
  type ReplyLineHeightId,
} from "@/lib/reply-line-height";

export function useReplyLineHeight() {
  const [lineHeight, setLineHeight] = useState<ReplyLineHeightId>(
    REPLY_LINE_HEIGHT.default,
  );
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setLineHeight(loadReplyLineHeight());
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === "aichatdeck-reply-line-height") refresh();
    };
    const onCustom = () => refresh();

    window.addEventListener("storage", onStorage);
    window.addEventListener("aichatdeck-reply-line-height", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("aichatdeck-reply-line-height", onCustom);
    };
  }, [refresh]);

  const setReplyLineHeight = useCallback((id: ReplyLineHeightId) => {
    setLineHeight(id);
    saveReplyLineHeight(id);
  }, []);

  return {
    lineHeight,
    hydrated,
    setReplyLineHeight,
  };
}