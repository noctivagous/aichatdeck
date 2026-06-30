"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadSessionOutlineSidebarOpen,
  saveSessionOutlineSidebarOpen,
} from "@/lib/session-outline-sidebar";

export function useSessionOutlineSidebar() {
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOpen(loadSessionOutlineSidebarOpen());
    setHydrated(true);
  }, []);

  const setSidebarOpen = useCallback((next: boolean) => {
    setOpen(next);
    saveSessionOutlineSidebarOpen(next);
  }, []);

  const toggleSidebar = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      saveSessionOutlineSidebarOpen(next);
      return next;
    });
  }, []);

  return {
    sidebarOpen: open,
    hydrated,
    setSidebarOpen,
    toggleSidebar,
  };
}