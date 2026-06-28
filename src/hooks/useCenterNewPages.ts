"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadCenterNewPages,
  saveCenterNewPages,
} from "@/lib/center-new-pages";

export function useCenterNewPages() {
  const [centerNewPages, setCenterNewPages] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCenterNewPages(loadCenterNewPages());
    setHydrated(true);
  }, []);

  const setCenterNewPagesEnabled = useCallback((enabled: boolean) => {
    setCenterNewPages(enabled);
    saveCenterNewPages(enabled);
  }, []);

  return {
    centerNewPages,
    hydrated,
    setCenterNewPagesEnabled,
  };
}