"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadStreamingDisplay,
  saveStreamingDisplay,
  type StreamingDisplaySettings,
} from "@/lib/streaming-display";

export function useStreamingDisplay() {
  const [settings, setSettings] = useState(loadStreamingDisplay);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadStreamingDisplay());
    setHydrated(true);
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<StreamingDisplaySettings>) => {
      setSettings((current) => {
        const next = { ...current, ...patch };
        saveStreamingDisplay(next);
        return next;
      });
    },
    [],
  );

  return {
    streamingDisplay: settings,
    hydrated,
    setStreamingDisplay: updateSettings,
  };
}