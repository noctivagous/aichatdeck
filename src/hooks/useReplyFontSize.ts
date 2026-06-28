"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadReplyFontScale,
  REPLY_FONT_SCALE,
  saveReplyFontScale,
  type ReplyFontScaleId,
} from "@/lib/reply-font-size";

export function useReplyFontSize() {
  const [fontScale, setFontScale] = useState<ReplyFontScaleId>(
    REPLY_FONT_SCALE.default,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFontScale(loadReplyFontScale());
    setHydrated(true);
  }, []);

  const setReplyFontScale = useCallback((scale: ReplyFontScaleId) => {
    setFontScale(scale);
    saveReplyFontScale(scale);
  }, []);

  return {
    fontScale,
    hydrated,
    setReplyFontScale,
  };
}