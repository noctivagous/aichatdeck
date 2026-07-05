"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadNewPageMode,
  NEW_PAGE_MODE_DEFAULT,
  saveNewPageMode,
  type NewPageMode,
} from "@/lib/new-page-mode";

export function useNewPageMode() {
  const [newPageMode, setNewPageMode] = useState<NewPageMode>(
    NEW_PAGE_MODE_DEFAULT,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setNewPageMode(loadNewPageMode());
    setHydrated(true);
  }, []);

  const setNewPageModeValue = useCallback((mode: NewPageMode) => {
    setNewPageMode(mode);
    saveNewPageMode(mode);
  }, []);

  return {
    newPageMode,
    hydrated,
    setNewPageMode: setNewPageModeValue,
    isAutoNewPage: newPageMode === "auto",
  };
}