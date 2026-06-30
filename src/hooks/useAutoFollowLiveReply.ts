"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadAutoFollowLiveReply,
  saveAutoFollowLiveReply,
} from "@/lib/auto-follow-live-reply";

export function useAutoFollowLiveReply() {
  const [autoFollowLiveReply, setAutoFollowLiveReply] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAutoFollowLiveReply(loadAutoFollowLiveReply());
    setHydrated(true);
  }, []);

  const setAutoFollowLiveReplyEnabled = useCallback((enabled: boolean) => {
    setAutoFollowLiveReply(enabled);
    saveAutoFollowLiveReply(enabled);
  }, []);

  return {
    autoFollowLiveReply,
    hydrated,
    setAutoFollowLiveReplyEnabled,
  };
}
