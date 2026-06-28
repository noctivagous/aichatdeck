"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadPageColumns,
  PAGE_COLUMNS,
  savePageColumns,
  type PageColumnCount,
} from "@/lib/page-columns";

export function usePageColumns() {
  const [columnCount, setColumnCount] = useState<PageColumnCount>(
    PAGE_COLUMNS.default,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setColumnCount(loadPageColumns());
    setHydrated(true);
  }, []);

  const setColumns = useCallback((columns: PageColumnCount) => {
    setColumnCount(columns);
    savePageColumns(columns);
  }, []);

  return {
    columnCount,
    hydrated,
    setColumns,
  };
}