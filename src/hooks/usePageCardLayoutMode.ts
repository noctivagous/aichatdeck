"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadPageCardLayoutMode,
  PAGE_CARD_LAYOUT_MODE_DEFAULT,
  savePageCardLayoutMode,
  type PageCardLayoutMode,
} from "@/lib/page-card-layout-mode";

export function usePageCardLayoutMode() {
  const [layoutMode, setLayoutModeState] = useState<PageCardLayoutMode>(
    PAGE_CARD_LAYOUT_MODE_DEFAULT,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLayoutModeState(loadPageCardLayoutMode());
    setHydrated(true);
  }, []);

  const setLayoutMode = useCallback((mode: PageCardLayoutMode) => {
    setLayoutModeState(mode);
    savePageCardLayoutMode(mode);
  }, []);

  return {
    layoutMode,
    hydrated,
    setLayoutMode,
  };
}