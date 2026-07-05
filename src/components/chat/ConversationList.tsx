"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useKeybindings } from "@/hooks/useKeybindings";
import type { Keybinding } from "@/lib/keybindings/types";
import { cn } from "@/lib/utils";
import {
  Download,
  Plus,
  MessageSquare,
  Rows3,
  Settings,
  SquareKanban,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  createConversation,
  deleteConversation,
  downloadDatabaseExport,
  listConversations,
} from "@/lib/db";
import type { UIMessage } from "ai";
import type { ConversationRecord } from "@/lib/types";
import { encodeModelRef } from "@/lib/model-ref";
import {
  hasConnectedProvider,
  loadSettings,
} from "@/lib/settings";
import { toast } from "sonner";
import { SessionOutlineSidebar } from "./SessionOutlineSidebar";
import {
  countItems,
  DEFAULT_COUNTING_TYPE,
  formatCountLabel,
} from "@/lib/counting-types";
import {
  computePages,
  formatPageCountLabel,
  pageCountForConversation,
} from "@/lib/pages";
import { buildSessionOutline } from "@/lib/session-outline";
import { buildChatNavigateHref } from "@/lib/chat-navigation";
import { keyBadgeClass } from "@/lib/keybindings/match";
import { stashPendingComposerSend } from "@/lib/pending-composer-send";
import { pushWithViewTransition } from "@/lib/view-transition-nav";
import { Composer, type ComposerHandle } from "./Composer";
import { ConversationListToolbar } from "./ConversationListToolbar";
import { MessageSearchResult } from "./MessageSearchResult";
import {
  applyConversationListQuery,
  DEFAULT_CONVERSATION_FILTER,
  DEFAULT_CONVERSATION_SEARCH_SCOPE,
  DEFAULT_CONVERSATION_SORT,
  MAX_MESSAGE_MATCHES_PER_CONVERSATION,
  type ConversationFilterId,
  type ConversationListEntry,
  type ConversationListQuery,
  type ConversationSearchMatch,
  type ConversationSearchScope,
  type ConversationSortId,
} from "@/lib/conversation-list-query";

const VIEW_MODE_STORAGE_KEY = "aichatdeck:conversation-list:view-mode";
const FILTER_STORAGE_KEY = "aichatdeck:conversation-list:filter";
const SORT_STORAGE_KEY = "aichatdeck:conversation-list:sort";
const SEARCH_SCOPE_STORAGE_KEY = "aichatdeck:conversation-list:search-scope";

function messageMatchHref(
  conversationId: string,
  match: ConversationSearchMatch,
): string {
  return buildChatNavigateHref(
    conversationId,
    match.pageIndex,
    match.headingSlug,
  );
}

function conversationHref(entry: ConversationListEntry): string {
  const { conversation, messageMatches } = entry;
  const firstMatch = messageMatches?.[0];
  if (firstMatch) {
    return messageMatchHref(conversation.id, firstMatch);
  }
  return `/chat/${conversation.id}`;
}

function messageRoleLabel(role: UIMessage["role"]): string {
  switch (role) {
    case "user":
      return "you";
    case "assistant":
      return "assistant";
    case "system":
      return "system";
    default:
      return "message";
  }
}

type ConversationListViewMode = "list" | "cards";

export function ConversationList() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ConversationListViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<ConversationSearchScope>(
    DEFAULT_CONVERSATION_SEARCH_SCOPE,
  );
  const [filter, setFilter] = useState<ConversationFilterId>(
    DEFAULT_CONVERSATION_FILTER,
  );
  const [sort, setSort] = useState<ConversationSortId>(
    DEFAULT_CONVERSATION_SORT,
  );
  const [composerInput, setComposerInput] = useState("");
  const [startingChat, setStartingChat] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ComposerHandle>(null);
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const listQuery = useMemo<ConversationListQuery>(
    () => ({
      search: searchQuery,
      searchScope,
      filter,
      sort,
    }),
    [searchQuery, searchScope, filter, sort],
  );

  const displayedConversations = useMemo(
    () => applyConversationListQuery(conversations, listQuery),
    [conversations, listQuery],
  );

  const displayedConversationsRef = useRef(displayedConversations);
  displayedConversationsRef.current = displayedConversations;

  const refresh = async () => {
    const items = await listConversations();
    setConversations(items);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (displayedConversations.length === 0) {
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((current) =>
      Math.min(current, displayedConversations.length - 1),
    );
  }, [displayedConversations.length, listQuery]);

  useEffect(() => {
    if (displayedConversations.length === 0) return;
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-conversation-index="${selectedIndex}"]`,
    );
    row?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedIndex, displayedConversations.length]);

  useEffect(() => {
    const savedMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (savedMode === "list" || savedMode === "cards") {
      setViewMode(savedMode);
      return;
    }

    const mobileDefault = window.matchMedia("(max-width: 767px)").matches;
    setViewMode(mobileDefault ? "cards" : "list");

    const savedFilter = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (
      savedFilter === "all" ||
      savedFilter === "multi-page" ||
      savedFilter === "single-page" ||
      savedFilter === "has-qa" ||
      savedFilter === "empty" ||
      savedFilter === "openai" ||
      savedFilter === "anthropic" ||
      savedFilter === "google" ||
      savedFilter === "openrouter" ||
      savedFilter === "xai"
    ) {
      setFilter(savedFilter);
    }

    const savedSort = window.localStorage.getItem(SORT_STORAGE_KEY);
    if (
      savedSort === "updated-desc" ||
      savedSort === "updated-asc" ||
      savedSort === "created-desc" ||
      savedSort === "created-asc" ||
      savedSort === "title-asc" ||
      savedSort === "title-desc" ||
      savedSort === "qa-desc" ||
      savedSort === "pages-desc"
    ) {
      setSort(savedSort);
    }

    const savedSearchScope = window.localStorage.getItem(SEARCH_SCOPE_STORAGE_KEY);
    if (savedSearchScope === "title" || savedSearchScope === "messages") {
      setSearchScope(savedSearchScope);
    }
  }, []);

  const openSelectedConversation = useCallback(() => {
    const entry =
      displayedConversationsRef.current[selectedIndexRef.current];
    if (entry) {
      pushWithViewTransition(router, conversationHref(entry), "forward");
    }
  }, [router]);

  const menuBindings = useMemo<Keybinding[]>(
    () => [
      {
        id: "menu-up",
        chord: "arrowup",
        scope: "main-menu",
        when: () => displayedConversationsRef.current.length > 0,
        handler: () => {
          setSelectedIndex((current) => Math.max(0, current - 1));
        },
      },
      {
        id: "menu-down",
        chord: "arrowdown",
        scope: "main-menu",
        when: () => displayedConversationsRef.current.length > 0,
        handler: () => {
          setSelectedIndex((current) =>
            Math.min(
              displayedConversationsRef.current.length - 1,
              current + 1,
            ),
          );
        },
      },
      {
        id: "menu-open",
        chord: "enter",
        scope: "main-menu",
        when: () => displayedConversationsRef.current.length > 0,
        handler: openSelectedConversation,
      },
      {
        id: "menu-open-right",
        chord: "arrowright",
        scope: "main-menu",
        when: () => displayedConversationsRef.current.length > 0,
        handler: openSelectedConversation,
      },
      {
        id: "menu-focus-composer",
        chord: "alt+t",
        scope: "main-menu",
        handler: () => {
          composerRef.current?.focus();
        },
      },
    ],
    [openSelectedConversation],
  );

  useKeybindings("main-menu", menuBindings);

  const selectedEntry = displayedConversations[selectedIndex] ?? null;
  const selectedConversation = selectedEntry?.conversation ?? null;
  const selectedOutline = useMemo(() => {
    if (!selectedConversation) return null;
    const pages = computePages(
      selectedConversation.messages,
      selectedConversation.pageBreaks,
    );
    return buildSessionOutline(selectedConversation.title, pages);
  }, [selectedConversation]);

  const handleOutlineNavigate = useCallback(
    (pageIndex: number, headingSlug?: string) => {
      const entry =
        displayedConversationsRef.current[selectedIndexRef.current];
      if (!entry) return;
      pushWithViewTransition(
        router,
        buildChatNavigateHref(entry.conversation.id, pageIndex, headingSlug),
        "forward",
      );
    },
    [router],
  );

  const handleSearchScopeChange = (nextScope: ConversationSearchScope) => {
    setSearchScope(nextScope);
    window.localStorage.setItem(SEARCH_SCOPE_STORAGE_KEY, nextScope);
  };

  const ensureReadyForNewChat = useCallback(async () => {
    const settings = await loadSettings();
    if (!hasConnectedProvider(settings)) {
      toast.error("Connect a provider in Settings before starting a chat");
      router.push("/settings");
      return null;
    }

    const defaultModel = settings.defaultModel;
    if (!defaultModel) {
      toast.error("Choose a default model in Settings");
      router.push("/settings");
      return null;
    }

    return { settings, defaultModel };
  }, [router]);

  const handleNew = async () => {
    const ready = await ensureReadyForNewChat();
    if (!ready) return;

    const conv = await createConversation(
      "New conversation",
      encodeModelRef(ready.defaultModel),
    );
    pushWithViewTransition(router, `/chat/${conv.id}`, "forward");
  };

  const startChatWithComposer = useCallback(
    async (payload: { text: string; files?: FileList }) => {
      const text = payload.text.trim();
      if (!text && !payload.files?.length) return;

      setStartingChat(true);
      try {
        const ready = await ensureReadyForNewChat();
        if (!ready) return;

        const conv = await createConversation(
          "New conversation",
          encodeModelRef(ready.defaultModel),
        );
        stashPendingComposerSend({
          text: text || "What is in this image?",
          files: payload.files,
        });
        setComposerInput("");
        pushWithViewTransition(router, `/chat/${conv.id}`, "forward");
      } finally {
        setStartingChat(false);
      }
    },
    [ensureReadyForNewChat, router],
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadDatabaseExport();
      toast.success("Database exported");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export database",
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    setConfirmDeleteId((current) => (current === id ? null : current));
    toast.success("Conversation deleted");
    void refresh();
  };

  const handleDeleteClick = (
    conv: ConversationRecord,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (conv.messages.length <= 1) {
      void handleDelete(conv.id);
      return;
    }
    setConfirmDeleteId(conv.id);
  };

  const handleViewModeChange = (nextMode: ConversationListViewMode) => {
    setViewMode(nextMode);
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, nextMode);
  };

  const handleFilterChange = (nextFilter: ConversationFilterId) => {
    setFilter(nextFilter);
    window.localStorage.setItem(FILTER_STORAGE_KEY, nextFilter);
  };

  const handleSortChange = (nextSort: ConversationSortId) => {
    setSort(nextSort);
    window.localStorage.setItem(SORT_STORAGE_KEY, nextSort);
  };

  const handleResetListQuery = () => {
    setSearchQuery("");
    setSearchScope(DEFAULT_CONVERSATION_SEARCH_SCOPE);
    setFilter(DEFAULT_CONVERSATION_FILTER);
    setSort(DEFAULT_CONVERSATION_SORT);
    window.localStorage.setItem(FILTER_STORAGE_KEY, DEFAULT_CONVERSATION_FILTER);
    window.localStorage.setItem(SORT_STORAGE_KEY, DEFAULT_CONVERSATION_SORT);
    window.localStorage.setItem(
      SEARCH_SCOPE_STORAGE_KEY,
      DEFAULT_CONVERSATION_SEARCH_SCOPE,
    );
  };

  const renderConversationItems = (mode: ConversationListViewMode) => {
    if (loading) {
      return <div className="p-6 text-sm text-zinc-500">Loading…</div>;
    }

    if (conversations.length === 0) {
      return (
        <div className={cn("p-8 text-center", mode === "cards" && "w-full")}>
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-500">No conversations yet</p>
          <Button className="mt-4" onClick={() => void handleNew()}>
            Start your first chat
          </Button>
        </div>
      );
    }

    if (displayedConversations.length === 0) {
      return (
        <div className={cn("p-8 text-center", mode === "cards" && "w-full")}>
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-500">
            No conversations match your search or filters
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={handleResetListQuery}
          >
            Reset search and filters
          </Button>
        </div>
      );
    }

    return displayedConversations.map((entry, index) => {
      const conv = entry.conversation;
      const messageMatches = entry.messageMatches ?? [];
      const hasMessageMatches = messageMatches.length > 0;
      const rowClassName = cn(
        mode === "list"
          ? "group px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
          : "group min-w-[250px] max-w-[320px] rounded-xl border border-zinc-200 bg-white p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:bg-zinc-900",
        selectedIndex === index &&
          "bg-blue-50 ring-2 ring-inset ring-blue-500/35 dark:bg-blue-500/10",
      );

      const deleteControls =
        confirmDeleteId === conv.id ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-1.5",
              mode === "cards" &&
                "mt-3 w-full justify-end border-t border-zinc-200 pt-3 dark:border-zinc-800",
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <span className="text-xs text-zinc-500">Delete?</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirmDeleteId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 bg-red-600 px-2 text-xs hover:bg-red-500"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleDelete(conv.id);
              }}
            >
              Delete
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              mode === "list" ? "opacity-0 group-hover:opacity-100" : "self-end",
            )}
            onClick={(e) => handleDeleteClick(conv, e)}
            aria-label="Delete conversation"
          >
            <Trash2 className="h-4 w-4 text-zinc-500" />
          </Button>
        );

      const metadata = (
        <p className="text-xs text-zinc-500">
          {formatPageCountLabel(
            pageCountForConversation(conv.messages, conv.pageBreaks),
          )}{" "}
          ·{" "}
          {formatCountLabel(
            countItems(conv.messages, DEFAULT_COUNTING_TYPE),
            DEFAULT_COUNTING_TYPE,
          )}{" "}
          · {new Date(conv.updatedAt).toLocaleDateString()}
        </p>
      );

      const titleButton = (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            pushWithViewTransition(
              router,
              hasMessageMatches
                ? messageMatchHref(conv.id, messageMatches[0]!)
                : `/chat/${conv.id}`,
              "forward",
            );
          }}
          className="block w-full truncate text-left font-medium transition hover:text-blue-700 dark:hover:text-blue-300"
        >
          {conv.title}
        </button>
      );

      const matchResults = hasMessageMatches ? (
        <div className="mt-2 flex w-full min-w-0 flex-col gap-1.5 rounded-lg border border-zinc-200/70 p-1.5 ring-1 ring-inset ring-zinc-200/50 dark:border-zinc-700/70 dark:ring-zinc-700/40">
          {messageMatches.map((match) => (
            <MessageSearchResult
              key={`${conv.id}-${match.id}`}
              conversationId={conv.id}
              match={match}
              roleLabel={messageRoleLabel}
            />
          ))}
          {messageMatches.length >= MAX_MESSAGE_MATCHES_PER_CONVERSATION ? (
            <p className="px-2 text-[10px] text-zinc-400">
              Showing first {MAX_MESSAGE_MATCHES_PER_CONVERSATION} matches
            </p>
          ) : null}
        </div>
      ) : null;

      if (hasMessageMatches) {
        return (
          <div
            key={conv.id}
            data-conversation-index={index}
            className={rowClassName}
            onMouseEnter={() => {
              setSelectedIndex(index);
              setConfirmDeleteId((current) =>
                current !== null && current !== conv.id ? null : current,
              );
            }}
          >
            <div
              className={cn(
                "flex items-start justify-between gap-3",
                mode === "cards" && "flex-col",
              )}
            >
              <div className="min-w-0 flex-1">
                {titleButton}
                {matchResults}
              </div>
              {deleteControls}
            </div>
          </div>
        );
      }

      return (
        <Link
          key={conv.id}
          href={conversationHref(entry)}
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
            pushWithViewTransition(router, conversationHref(entry), "forward");
          }}
          data-conversation-index={index}
          className={cn(rowClassName, "flex items-center justify-between")}
          onMouseEnter={() => {
            setSelectedIndex(index);
            setConfirmDeleteId((current) =>
              current !== null && current !== conv.id ? null : current,
            );
          }}
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{conv.title}</p>
            {metadata}
          </div>
          {deleteControls}
        </Link>
      );
    });
  };

  return (
    <div className="flex h-[100dvh] flex-col">
      <header
        style={{ viewTransitionName: "app-header" }}
        className="z-40 shrink-0 border-b border-zinc-200/70 bg-white/80 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/70"
      >
        <div className="mx-auto flex h-[60px] w-full max-w-5xl items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_4px_12px_-4px_rgba(37,99,235,0.5)]">
              💬
            </div>
            <h1 className="truncate text-[15px] font-semibold leading-none tracking-tight">
              AIChatDeck
            </h1>
            <div
              className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900"
              role="group"
              aria-label="Conversation list layout"
            >
              <button
                type="button"
                aria-pressed={viewMode === "list"}
                title="Sidebar + list view"
                onClick={() => handleViewModeChange("list")}
                className={cn(
                  "rounded-[5px] px-2 py-1 text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
                  viewMode === "list" &&
                    "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
                )}
              >
                <Rows3 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "cards"}
                title="Cards + full-width outline view"
                onClick={() => handleViewModeChange("cards")}
                className={cn(
                  "rounded-[5px] px-2 py-1 text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
                  viewMode === "cards" &&
                    "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
                )}
              >
                <SquareKanban className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="hidden shrink-0 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 lg:block">
              Use <kbd className={keyBadgeClass}>↑</kbd> and{" "}
              <kbd className={keyBadgeClass}>↓</kbd> to navigate menu.{" "}
              <kbd className={keyBadgeClass}>→</kbd> or <kbd className={keyBadgeClass}>Enter</kbd> to open a chat.
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Export database"
              title="Export database"
              disabled={exporting}
              onClick={() => void handleExport()}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link href="/settings" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="sm" onClick={() => void handleNew()}>
              <Plus className="h-4 w-4" />
              New chat
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-3 px-4 pb-4 md:px-6">
        <ConversationListToolbar
          search={searchQuery}
          searchScope={searchScope}
          filter={filter}
          sort={sort}
          totalCount={conversations.length}
          visibleCount={displayedConversations.length}
          onSearchChange={setSearchQuery}
          onSearchScopeChange={handleSearchScopeChange}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
          onReset={handleResetListQuery}
        />

        {viewMode === "list" ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:gap-0 lg:grid-cols-[minmax(0,1fr)_260px]">
            <ScrollArea
              style={{ viewTransitionName: "main-panel" }}
              className="min-h-[320px] rounded-xl border border-zinc-200 dark:border-zinc-800 lg:min-h-0"
            >
              <div
                ref={listRef}
                className="divide-y divide-zinc-200 dark:divide-zinc-800"
              >
                {renderConversationItems("list")}
              </div>
            </ScrollArea>

            <SessionOutlineSidebar
              mode="interactive"
              outline={selectedOutline}
              onSelectPage={handleOutlineNavigate}
              transitionName="session-outline"
              className="min-h-[280px] rounded-xl border border-zinc-200 dark:border-zinc-800 lg:min-h-0 lg:border-r-0"
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <ScrollArea
              style={{ viewTransitionName: "main-panel" }}
              className="h-[150px] shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-800"
            >
              <div ref={listRef} className="flex h-full w-max min-w-full items-stretch gap-3 p-3">
                {renderConversationItems("cards")}
              </div>
            </ScrollArea>

            <SessionOutlineSidebar
              mode="interactive"
              outline={selectedOutline}
              onSelectPage={handleOutlineNavigate}
              transitionName="session-outline"
              className="min-h-[320px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800"
            />
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-zinc-200/70 bg-white/85 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/85">
        <div className="mx-auto w-full max-w-5xl p-3 md:px-6 md:py-3.5">
          <Composer
            ref={composerRef}
            value={composerInput}
            onChange={setComposerInput}
            onSend={() => void startChatWithComposer({ text: composerInput })}
            onAttach={(files) =>
              void startChatWithComposer({ text: composerInput, files })
            }
            isStreaming={false}
            disabled={startingChat}
            inputAriaLabel="Message input for a new chat"
          />
        </div>
      </footer>
    </div>
  );
}