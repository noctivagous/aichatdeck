"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createDefaultSettings,
  loadSettings,
  saveSettings,
} from "@/lib/settings";
import type { AppSettings } from "@/lib/types";

export function useHydratedSettings() {
  const [settings, setSettings] = useState<AppSettings>(createDefaultSettings);
  const [hydrated, setHydrated] = useState(false);

  const reload = useCallback(async () => {
    try {
      const next = await loadSettings();
      setSettings(next);
    } catch {
      setSettings(createDefaultSettings());
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await reload();
      setHydrated(true);
    })();
  }, [reload]);

  const persist = useCallback(
    (next: AppSettings | ((current: AppSettings) => AppSettings)) => {
      setSettings((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        void saveSettings(resolved);
        return resolved;
      });
    },
    [],
  );

  return {
    settings,
    setSettings: persist,
    hydrated,
    reload,
  };
}