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
import {
  sendToActivePage,
  shouldAppendToActivePage,
} from "@/lib/active-page-send";
import { DEFAULT_COUNTING_TYPE } from "@/lib/counting-types";
import {
  computePageMessageRanges,
  computePages,
  liveItemCount,
  maybeAutoSealActivePage,
  normalizeConversationPageState,
  resolveComposePageIndex,
  sealActivePageBeforeNewPage,
  setPageSealState,
} from "@/lib/pages";
import {
  getConversation,
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
import { useAutoFollowLiveReply } from "@/hooks/useAutoFollowLiveReply";
import { useSessionOutlineSidebar } from "@/hooks/useSessionOutlineSidebar";
import { buildSessionOutline } from "@/lib/session-outline";
import type { ChatNavigateTarget } from "@/lib/chat-navigation";
import { PageWidthSlider } from "./PageWidthSlider";
import { PageColumnsControl } from "./PageColumnsControl";
import { ReplyFontSizeControl } from "./ReplyFontSizeControl";
import { cn } from "@/lib/utils";
import { pushWithViewTransition } from "@/lib/view-transition-nav";

type ChatSessionProps = {
  conversationId: string;
  initialTitle: string;
  initialModelId: string;
  initialMessages: UIMessage[];
  initialPageBreaks?: number[];
  initialSealedPageIndices?: number[];
  initialActivePageIndex?: number;
  initialFocusedPageIndex?: number;
  initialNavigateTo?: ChatNavigateTarget | null;
};

const areNumberArraysEqual = (a: number[], b: number[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const areMessageListsEqual = (a: UIMessage[], b: UIMessage[]) =>
  a.length === b.length &&
  a.every((message, index) => {
    const other = b[index];
    if (!other) return false;
    if (message.id !== other.id || message.role !== other.role) return false;
    return JSON.stringify(message.parts) === JSON.stringify(other.parts);
  });

export function ChatSession({
  conversationId,
  initialTitle,
  initialModelId,
  initialMessages,
  initialPageBreaks = [],
  initialSealedPageIndices,
  initialActivePageIndex,
  initialFocusedPageIndex = 0,
  initialNavigateTo = null,
}: ChatSessionProps) {
  const initialPageState = normalizeConversationPageState(
    initialMessages,
    initialPageBreaks,
    initialSealedPageIndices,
    initialActivePageIndex,
  );
  const router = useRouter();
  const { settings, hydrated, reload } = useHydratedSettings();
  const { pageWidth, setPreviewWidth, commitWidth } = usePageWidth();
  const { columnCount, setColumns } = usePageColumns();
  const { fontScale, setReplyFontScale } = useReplyFontSize();
  const { lineHeight } = useReplyLineHeight();
  const { centerNewPages } = useCenterNewPages();
  const { autoFollowLiveReply } = useAutoFollowLiveReply();
  const { sidebarOpen, toggleSidebar } = useSessionOutlineSidebar();
  const slidesTrackRef = useRef<SlidesTrackHandle>(null);
  const navigateHandledRef = useRef(false);
  const [modelId, setModelId] = useState(initialModelId);
  const [input, setInput] = useState("");
  const [title, setTitle] = useState(initialTitle);
  const [pageBreaks, setPageBreaks] = useState<number[]>(
    initialPageState.pageBreaks,
  );
  const [sealedPageIndices, setSealedPageIndices] = useState<number[]>(
    initialPageState.sealedPageIndices,
  );
  const [activePageIndex, setActivePageIndex] = useState(
    initialPageState.activePageIndex,
  );
  const [insertStreaming, setInsertStreaming] = useState(false);
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

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    error,
  } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  });

  const pages = useMemo(
    () => computePages(messages, pageBreaks, sealedPageIndices),
    [messages, pageBreaks, sealedPageIndices],
  );
  const outline = useMemo(
    () => buildSessionOutline(title, pages),
    [title, pages],
  );
  const isStreaming =
    status === "streaming" || status === "submitted" || insertStreaming;
  const composePageIndex = useMemo(
    () => resolveComposePageIndex(focusedPageIndex, pages),
    [focusedPageIndex, pages],
  );

  const canStartNewPage =
    composePageIndex >= 0 &&
    liveItemCount(
      messages,
      pageBreaks,
      DEFAULT_COUNTING_TYPE,
      sealedPageIndices,
      composePageIndex,
    ) > 0;
  const streamingMessageId = useMemo(() => {
    if (!isStreaming || composePageIndex < 0) return undefined;

    const ranges = computePageMessageRanges(
      messages,
      pageBreaks,
      sealedPageIndices,
    );
    const range = ranges[composePageIndex];
    if (!range || range.endIndex < range.startIndex) {
      const last = messages[messages.length - 1];
      return last?.role === "assistant" ? last.id : undefined;
    }

    for (let index = range.endIndex; index >= range.startIndex; index -= 1) {
      const message = messages[index];
      if (message?.role === "assistant") return message.id;
    }

    return undefined;
  }, [isStreaming, composePageIndex, messages, pageBreaks, sealedPageIndices]);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageSyncCompleteRef = useRef(false);
  const pageBreaksRef = useRef(pageBreaks);
  const sealedPageIndicesRef = useRef(sealedPageIndices);
  const activePageIndexRef = useRef(activePageIndex);
  const modelIdRef = useRef(modelId);
  const messagesRef = useRef(messages);
  const focusedPageRef = useRef(focusedPageIndex);
  pageBreaksRef.current = pageBreaks;
  sealedPageIndicesRef.current = sealedPageIndices;
  activePageIndexRef.current = activePageIndex;
  modelIdRef.current = modelId;
  messagesRef.current = messages;
  focusedPageRef.current = focusedPageIndex;

  const flushPersist = useCallback(
    (options?: { keepalive?: boolean }) => {
      const currentMessages = messagesRef.current;
      if (currentMessages.length === 0) {
        return updateConversation(
          conversationId,
          {
            focusedPageIndex: focusedPageRef.current,
            activePageIndex: activePageIndexRef.current,
            sealedPageIndices: sealedPageIndicesRef.current,
            pageBreaks: pageBreaksRef.current,
          },
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
          sealedPageIndices: sealedPageIndicesRef.current,
          activePageIndex: activePageIndexRef.current,
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
    let cancelled = false;

    void (async () => {
      try {
        const latest = await getConversation(conversationId);
        if (!latest || cancelled) return;

        if (!areMessageListsEqual(messagesRef.current, latest.messages)) {
          setMessages(latest.messages);
        }

        const nextPageState = normalizeConversationPageState(
          latest.messages,
          latest.pageBreaks ?? [],
          latest.sealedPageIndices,
          latest.activePageIndex,
        );
        if (!areNumberArraysEqual(pageBreaksRef.current, nextPageState.pageBreaks)) {
          pageBreaksRef.current = nextPageState.pageBreaks;
          setPageBreaks(nextPageState.pageBreaks);
        }
        if (
          !areNumberArraysEqual(
            sealedPageIndicesRef.current,
            nextPageState.sealedPageIndices,
          )
        ) {
          sealedPageIndicesRef.current = nextPageState.sealedPageIndices;
          setSealedPageIndices(nextPageState.sealedPageIndices);
        }
        if (activePageIndexRef.current !== nextPageState.activePageIndex) {
          activePageIndexRef.current = nextPageState.activePageIndex;
          setActivePageIndex(nextPageState.activePageIndex);
        }

        const nextFocused = Math.max(0, latest.focusedPageIndex ?? 0);
        if (focusedPageRef.current !== nextFocused) {
          focusedPageRef.current = nextFocused;
          setFocusedPageIndex(nextFocused);
        }
      } finally {
        if (!cancelled) {
          storageSyncCompleteRef.current = true;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, setMessages]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (!storageSyncCompleteRef.current) return;

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
    if (isStreaming) return;

    const nextState = maybeAutoSealActivePage(
      messages,
      pageBreaks,
      sealedPageIndices,
      composePageIndex,
    );
    if (!nextState) return;

    pageBreaksRef.current = nextState.pageBreaks;
    sealedPageIndicesRef.current = nextState.sealedPageIndices;
    activePageIndexRef.current = nextState.activePageIndex;
    setPageBreaks(nextState.pageBreaks);
    setSealedPageIndices(nextState.sealedPageIndices);
    setActivePageIndex(nextState.activePageIndex);
  }, [messages, isStreaming, pageBreaks, sealedPageIndices, composePageIndex]);

  useEffect(() => {
    const onPageHide = () => {
      if (!isStreaming) return;
      void flushPersist({ keepalive: true });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [flushPersist, isStreaming]);

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

  const dispatchToComposePage = useCallback(
    async ({
      text,
      files,
    }: {
      text: string;
      files?: FileList;
    }) => {
      const currentPages = computePages(
        messagesRef.current,
        pageBreaksRef.current,
        sealedPageIndicesRef.current,
      );
      const targetPageIndex = resolveComposePageIndex(
        focusedPageRef.current,
        currentPages,
      );

      if (targetPageIndex < 0) {
        toast.error("Unseal a page before sending a message");
        return;
      }

      if (
        shouldAppendToActivePage(
          messagesRef.current,
          pageBreaksRef.current,
          sealedPageIndicesRef.current,
          targetPageIndex,
        )
      ) {
        sendMessage({ text, files });
        return;
      }

      setInsertStreaming(true);
      try {
        await sendToActivePage({
          text,
          files,
          messages: messagesRef.current,
          pageBreaks: pageBreaksRef.current,
          sealedPageIndices: sealedPageIndicesRef.current,
          activePageIndex: targetPageIndex,
          modelId: modelIdRef.current,
          onMessagesChange: setMessages,
          onPageBreaksChange: (nextPageBreaks) => {
            pageBreaksRef.current = nextPageBreaks;
            setPageBreaks(nextPageBreaks);
          },
        });
      } catch (error) {
        if (
          !(error instanceof Error) ||
          error.message !== "ACTIVE_PAGE_APPEND"
        ) {
          toast.error(
            error instanceof Error ? error.message : "Failed to send message",
          );
        }
      } finally {
        setInsertStreaming(false);
      }
    },
    [sendMessage, setMessages],
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    if (!ensureProviderReady()) return;
    void dispatchToComposePage({ text });
    setInput("");
  }, [input, isStreaming, ensureProviderReady, dispatchToComposePage]);

  const handleSendToNewPage = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    if (!ensureProviderReady()) return;

    const targetPageIndex = resolveComposePageIndex(focusedPageIndex, pages);

    if (canStartNewPage && targetPageIndex >= 0) {
      const nextState = sealActivePageBeforeNewPage(
        messages,
        pageBreaks,
        sealedPageIndices,
        targetPageIndex,
      );
      pageBreaksRef.current = nextState.pageBreaks;
      sealedPageIndicesRef.current = nextState.sealedPageIndices;
      activePageIndexRef.current = nextState.activePageIndex;
      setPageBreaks(nextState.pageBreaks);
      setSealedPageIndices(nextState.sealedPageIndices);
      setActivePageIndex(nextState.activePageIndex);
    }

    sendMessage({ text });
    setInput("");
  }, [
    input,
    isStreaming,
    ensureProviderReady,
    canStartNewPage,
    messages,
    pageBreaks,
    sealedPageIndices,
    focusedPageIndex,
    pages,
    sendMessage,
  ]);

  const handleAttach = useCallback(
    (files: FileList) => {
      if (isStreaming) return;
      if (!ensureProviderReady()) return;
      void dispatchToComposePage({
        text: input.trim() || "What is in this image?",
        files,
      });
      setInput("");
    },
    [input, isStreaming, ensureProviderReady, dispatchToComposePage],
  );

  const handleOutlineSelectPage = useCallback(
    (index: number, headingSlug?: string) => {
      slidesTrackRef.current?.focusPage(index, headingSlug);
    },
    [],
  );

  const handlePageSealChange = useCallback(
    (pageIndex: number, sealed: boolean) => {
      const pageCount = computePages(
        messagesRef.current,
        pageBreaksRef.current,
        sealedPageIndicesRef.current,
      ).length;
      const next = setPageSealState(
        pageIndex,
        sealed,
        sealedPageIndicesRef.current,
        activePageIndexRef.current,
        pageCount,
      );

      if (
        areNumberArraysEqual(
          sealedPageIndicesRef.current,
          next.sealedPageIndices,
        ) &&
        activePageIndexRef.current === next.activePageIndex
      ) {
        return;
      }

      sealedPageIndicesRef.current = next.sealedPageIndices;
      activePageIndexRef.current = next.activePageIndex;
      setSealedPageIndices(next.sealedPageIndices);
      setActivePageIndex(next.activePageIndex);

      if (!sealed) {
        focusedPageRef.current = pageIndex;
        setFocusedPageIndex(pageIndex);
        slidesTrackRef.current?.focusPage(pageIndex);
      }

      void flushPersist();
    },
    [flushPersist],
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
          backHref="/"
          transitionName="session-outline"
          className="hidden lg:flex"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
      <header
        style={{ viewTransitionName: "app-header" }}
        className="z-40 flex h-[60px] shrink-0 items-center gap-3 border-b border-zinc-200/70 bg-white/80 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/70 md:px-6"
      >
        <Button
          variant="ghost"
          size="icon"
          className={cn(sidebarOpen && "lg:hidden")}
          asChild
        >
          <Link
            href="/"
            aria-label="Back to conversations"
            onClick={(event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              event.preventDefault();
              pushWithViewTransition(router, "/", "back");
            }}
          >
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

      <div
        style={{ viewTransitionName: "main-panel" }}
        className="flex min-h-0 flex-1 flex-col"
      >
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
          autoFollowLiveReply={autoFollowLiveReply}
          autoFocusComposer={initialMessages.length === 0}
          onPageSealChange={handlePageSealChange}
        />
      </div>
      </div>
    </div>
  );
}