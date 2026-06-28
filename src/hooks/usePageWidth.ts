"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clampPageWidth,
  loadPageWidth,
  PAGE_WIDTH,
  savePageWidth,
} from "@/lib/page-width";

export function usePageWidth() {
  const [pageWidth, setPageWidth] = useState<number>(PAGE_WIDTH.narrow);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPageWidth(loadPageWidth());
    setHydrated(true);
  }, []);

  const setPreviewWidth = useCallback((width: number) => {
    setPageWidth(clampPageWidth(width));
  }, []);

  const commitWidth = useCallback((width: number) => {
    const next = clampPageWidth(width);
    setPageWidth(next);
    savePageWidth(next);
  }, []);

  return {
    pageWidth,
    hydrated,
    setPreviewWidth,
    commitWidth,
  };
}