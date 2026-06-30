"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Link from "next/link";
import { Settings, ArrowLeft, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { SlidesTrack, type SlidesTrackHandle } from "./SlidesTrack";
import { SessionOutlineSidebar } from "./SessionOutlineSidebar";
import { SessionOutlineToggle } from "./SessionOutlineToggle";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { computePages, liveMessageCount } from "@/lib/pages";
import {
  conversationTitleFromMessages,
  updateConversation,
} from "@/lib/db";
import { getProviderMeta } from "@/lib/providers";
import { encodeModelRef } from "@/lib/model-ref";
import { connectedModels, resolveModelRef } from "@/lib/settings";
import { useHydratedSettings } from "@/hooks/useHydratedSettings";
import { usePageWidth } from "@/hooks/usePageWidth";
import { usePageColumns } from "@/hooks/usePageColumns";
import { useReplyFontSize } from "@/hooks/useReplyFontSize";
import { useReplyLineHeight } from "@/hooks/useReplyLineHeight";
import { useCenterNewPages } from "@/hooks/useCenterNewPages";
import { useSessionOutlineSidebar } from "@/hooks/useSessionOutlineSidebar";
import { buildSessionOutline } from "@/lib/session-outline";
import type { ChatNavigateTarget } from "@/lib/chat-navigation";
import { PageWidthSlider } from "./PageWidthSlider";
import { PageColumnsControl } from "./PageColumnsControl";
import { ReplyFontSizeControl } from "./ReplyFontSizeControl";

type ChatSessionProps = {
  conversationId: string;
  initialTitle: string;
  initialModelId: string;
  initialMessages: UIMessage[];
  initialPageBreaks?: number[];
  initialFocusedPageIndex?: number;
  initialNavigateTo?: ChatNavigateTarget | null;
};

export function ChatSession({
  conversationId,
  initialTitle,
  initialModelId,
  initialMessages,
  initialPageBreaks = [],
  initialFocusedPageIndex = 0,
  initialNavigateTo = null,
}: ChatSessionProps) {
  const router = useRouter();
  const { settings, hydrated, reload } = useHydratedSettings();
  const { pageWidth, setPreviewWidth, commitWidth } = usePageWidth();
  const { columnCount, setColumns } = usePageColumns();
  const { fontScale, setReplyFontScale } = useReplyFontSize();
  const { lineHeight } = useReplyLineHeight();
  const { centerNewPages, setCenterNewPagesEnabled } = useCenterNewPages();
  const { sidebarOpen, toggleSidebar } = useSessionOutlineSidebar();
  const slidesTrackRef = useRef<SlidesTrackHandle>(null);
  const navigateHandledRef = useRef(false);
  const [modelId, setModelId] = useState(initialModelId);
  const [input, setInput] = useState("");
  const [title, setTitle] = useState(initialTitle);
  const [pageBreaks, setPageBreaks] = useState<number[]>(initialPageBreaks);
  const [focusedPageIndex, setFocusedPageIndex] = useState(
    initialFocusedPageIndex,
  );

  useEffect(() => {
    if (!hydrated) return;
    const resolved = resolveModelRef(settings, initialModelId);
    if (resolved) setModelId(encodeModelRef(resolved));
  }, [hydrated, settings, initialModelId]);

  const availableModels = useMemo(
    () => connectedModels(settings),
    [settings],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ modelId }),
      }),
    [modelId],
  );

  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  const pages = useMemo(
    () => computePages(messages, pageBreaks),
    [messages, pageBreaks],
  );
  const outline = useMemo(
    () => buildSessionOutline(title, pages),
    [title, pages],
  );
  const isStreaming = status === "streaming" || status === "submitted";
  const canStartNewPage = liveMessageCount(messages, pageBreaks) > 0;
  const streamingMessageId = useMemo(() => {
    if (!isStreaming) return undefined;
    const last = messages[messages.length - 1];
    return last?.role === "assistant" ? last.id : undefined;
  }, [isStreaming, messages]);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageBreaksRef = useRef(pageBreaks);
  const modelIdRef = useRef(modelId);
  const messagesRef = useRef(messages);
  const focusedPageRef = useRef(focusedPageIndex);
  pageBreaksRef.current = pageBreaks;
  modelIdRef.current = modelId;
  messagesRef.current = messages;
  focusedPageRef.current = focusedPageIndex;

  const flushPersist = useCallback(
    (options?: { keepalive?: boolean }) => {
      const currentMessages = messagesRef.current;
      if (currentMessages.length === 0) {
        return updateConversation(
          conversationId,
          { focusedPageIndex: focusedPageRef.current },
          options,
        );
      }

      const nextTitle = conversationTitleFromMessages(currentMessages);
      setTitle(nextTitle);

      return updateConversation(
        conversationId,
        {
          messages: currentMessages,
          title: nextTitle,
          modelId: modelIdRef.current,
          pageBreaks: pageBreaksRef.current,
          focusedPageIndex: focusedPageRef.current,
        },
        options,
      );
    },
    [conversationId],
  );

  const handleFocusedPageChange = useCallback(
    (index: number) => {
      focusedPageRef.current = index;
      setFocusedPageIndex(index);

      if (focusPersistTimerRef.current) {
        clearTimeout(focusPersistTimerRef.current);
      }

      focusPersistTimerRef.current = setTimeout(() => {
        void updateConversation(conversationId, { focusedPageIndex: index });
      }, 300);
    },
    [conversationId],
  );

  useEffect(() => {
    if (!hydrated) return;
    const onFocus = () => void reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [hydrated, reload]);

  useEffect(() => {
    if (messages.length === 0) return;

    setTitle(conversationTitleFromMessages(messages));

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);

    const delay = isStreaming ? 900 : 0;
    persistTimerRef.current = setTimeout(() => {
      void flushPersist();
    }, delay);

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [messages, isStreaming, flushPersist]);

  useEffect(() => {
    const onPageHide = () => {
      void flushPersist({ keepalive: true });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [flushPersist]);

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  const ensureProviderReady = useCallback(() => {
    const ref = resolveModelRef(settings, modelId);
    if (!ref) {
      toast.error("Connect a provider in Settings first");
      return false;
    }

    const providerState = settings.providers[ref.provider];
    if (providerState.status !== "connected") {
      toast.error(`Test your ${ref.provider} API key in Settings`);
      return false;
    }

    if (!providerState.apiKey.trim()) {
      toast.error(`Add your ${ref.provider} API key in Settings`);
      return false;
    }

    return true;
  }, [modelId, settings]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    if (!ensureProviderReady()) return;
    sendMessage({ text });
    setInput("");
  }, [input, isStreaming, ensureProviderReady, sendMessage]);

  const handleSendToNewPage = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    if (!ensureProviderReady()) return;

    if (canStartNewPage) {
      const nextBreak = messages.length - 1;
      if (!pageBreaks.includes(nextBreak)) {
        const nextPageBreaks = [...pageBreaks, nextBreak].sort((a, b) => a - b);
        pageBreaksRef.current = nextPageBreaks;
        setPageBreaks(nextPageBreaks);
      }
    }

    sendMessage({ text });
    setInput("");
  }, [
    input,
    isStreaming,
    ensureProviderReady,
    canStartNewPage,
    messages.length,
    pageBreaks,
    sendMessage,
  ]);

  const handleAttach = useCallback(
    (files: FileList) => {
      if (isStreaming) return;
      if (!ensureProviderReady()) return;
      sendMessage({
        text: input.trim() || "What is in this image?",
        files,
      });
      setInput("");
    },
    [input, isStreaming, ensureProviderReady, sendMessage],
  );

  const handleOutlineSelectPage = useCallback(
    (index: number, headingSlug?: string) => {
      slidesTrackRef.current?.focusPage(index, headingSlug);
    },
    [],
  );

  useEffect(() => {
    if (!initialNavigateTo || navigateHandledRef.current) return;
    if (pages.length === 0) return;

    navigateHandledRef.current = true;
    const clamped = Math.min(
      Math.max(0, initialNavigateTo.pageIndex),
      pages.length - 1,
    );

    const run = (attempts = 0) => {
      if (slidesTrackRef.current) {
        slidesTrackRef.current.focusPage(
          clamped,
          initialNavigateTo.headingSlug,
        );
        router.replace(`/chat/${conversationId}`, { scroll: false });
        return;
      }
      if (attempts < 30) requestAnimationFrame(() => run(attempts + 1));
    };

    requestAnimationFrame(() => run());
  }, [
    conversationId,
    initialNavigateTo,
    pages.length,
    router,
  ]);

  const handleExport = () => {
    const blob = new Blob(
      [JSON.stringify({ title, modelId, messages }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_") || "conversation"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Conversation exported");
  };

  return (
    <div className="flex h-[100dvh]">
      {sidebarOpen ? (
        <SessionOutlineSidebar
          mode="interactive"
          outline={outline}
          activePageIndex={focusedPageIndex}
          onSelectPage={handleOutlineSelectPage}
          className="hidden lg:flex"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
      <header className="z-40 flex h-[60px] shrink-0 items-center gap-3 border-b border-zinc-200/70 bg-white/80 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/70 md:px-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/" aria-label="Back to conversations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_4px_12px_-4px_rgba(37,99,235,0.5)]">
            💬
          </div>
          <div className="min-w-0 hidden sm:block">
            <h1 className="truncate text-[15px] font-semibold leading-none tracking-tight">
              {title}
            </h1>
            <p className="-mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              horizontal pages, one session
            </p>
          </div>
        </div>

        <div className="mx-auto flex items-center gap-2">
          <SessionOutlineToggle open={sidebarOpen} onToggle={toggleSidebar} />
          {availableModels.length > 0 ? (
            <Select
              value={modelId}
              onValueChange={(value) => {
                setModelId(value);
                void updateConversation(conversationId, { modelId: value });
              }}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem
                    key={`${model.provider}:${model.id}`}
                    value={encodeModelRef({
                      provider: model.provider,
                      modelId: model.id,
                    })}
                  >
                    [{getProviderMeta(model.provider).name}] {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">Connect a provider</Link>
            </Button>
          )}
          <PageWidthSlider
            value={pageWidth}
            onPreview={setPreviewWidth}
            onCommit={commitWidth}
          />
          <PageColumnsControl value={columnCount} onChange={setColumns} />
          <ReplyFontSizeControl value={fontScale} onChange={setReplyFontScale} />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <span className="hidden text-[12px] tabular-nums text-zinc-500 md:block">
            Page {pages.length} of {pages.length}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => regenerate()}
                disabled={messages.length < 2 || isStreaming}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Regenerate last reply
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" aria-label="Settings" asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <SlidesTrack
        ref={slidesTrackRef}
        pages={pages}
        pageWidth={pageWidth}
        columnCount={columnCount}
        fontScale={fontScale}
        lineHeight={lineHeight}
        isStreaming={isStreaming}
        streamingMessageId={streamingMessageId}
        composerValue={input}
        onComposerChange={setInput}
        onSend={handleSend}
        onSendToNewPage={handleSendToNewPage}
        onStop={stop}
        onAttach={handleAttach}
        initialFocusedPageIndex={focusedPageIndex}
        onFocusedPageChange={handleFocusedPageChange}
        centerNewPages={centerNewPages}
        onCenterNewPagesChange={setCenterNewPagesEnabled}
      />
      </div>
    </div>
  );
}