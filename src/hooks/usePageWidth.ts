"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AUTO_SIDE_INSET,
  clampAutoSideInset,
  clampPageWidth,
  loadAutoSideInset,
  loadPageWidth,
  loadPageWidthMode,
  PAGE_WIDTH,
  PAGE_WIDTH_MODE_DEFAULT,
  resolvePageWidth,
  saveAutoSideInset,
  savePageWidth,
  savePageWidthMode,
  type PageWidthMode,
} from "@/lib/page-width";

export function usePageWidth() {
  const [pageWidthMode, setPageWidthModeState] = useState<PageWidthMode>(
    PAGE_WIDTH_MODE_DEFAULT,
  );
  const [fixedWidth, setFixedWidth] = useState<number>(PAGE_WIDTH.narrow);
  const [autoSideInset, setAutoSideInset] = useState<number>(
    AUTO_SIDE_INSET.default,
  );
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFixedWidth(loadPageWidth());
    setPageWidthModeState(loadPageWidthMode());
    setAutoSideInset(loadAutoSideInset());
    setHydrated(true);
  }, []);

  const pageWidth = useMemo(
    () =>
      resolvePageWidth(
        pageWidthMode,
        fixedWidth,
        containerWidth,
        autoSideInset,
      ),
    [pageWidthMode, fixedWidth, containerWidth, autoSideInset],
  );

  const setPreviewWidth = useCallback((width: number) => {
    setFixedWidth(clampPageWidth(width));
  }, []);

  const commitWidth = useCallback((width: number) => {
    const next = clampPageWidth(width);
    setFixedWidth(next);
    savePageWidth(next);
  }, []);

  const setPreviewAutoSideInset = useCallback((inset: number) => {
    setAutoSideInset(clampAutoSideInset(inset));
  }, []);

  const commitAutoSideInset = useCallback((inset: number) => {
    const next = clampAutoSideInset(inset);
    setAutoSideInset(next);
    saveAutoSideInset(next);
  }, []);

  const setPageWidthMode = useCallback((mode: PageWidthMode) => {
    setPageWidthModeState(mode);
    savePageWidthMode(mode);
  }, []);

  const reportContainerWidth = useCallback((width: number) => {
    setContainerWidth(width);
  }, []);

  return {
    pageWidth,
    pageWidthMode,
    fixedWidth,
    autoSideInset,
    hydrated,
    setPageWidthMode,
    setPreviewWidth,
    commitWidth,
    setPreviewAutoSideInset,
    commitAutoSideInset,
    reportContainerWidth,
  };
}