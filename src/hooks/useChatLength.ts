"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CHAT_LENGTH_DEFAULT,
  loadChatLength,
  saveChatLength,
  type ChatLengthId,
} from "@/lib/chat-length";

export function useChatLength() {
  const [chatLength, setChatLengthState] = useState<ChatLengthId>(
    CHAT_LENGTH_DEFAULT,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setChatLengthState(loadChatLength());
    setHydrated(true);
  }, []);

  const setChatLength = useCallback((id: ChatLengthId) => {
    setChatLengthState(id);
    saveChatLength(id);
  }, []);

  return {
    chatLength,
    hydrated,
    setChatLength,
  };
}