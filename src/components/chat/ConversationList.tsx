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
import type { ConversationRecord } from "@/lib/types";
import { encodeModelRef } from "@/lib/model-ref";
import {
  hasConnectedProvider,
  loadSettings,
} from "@/lib/settings";
import { toast } from "sonner";
import { SessionOutlineSidebar } from "./SessionOutlineSidebar";
import { computePages } from "@/lib/pages";
import { buildSessionOutline } from "@/lib/session-outline";
import { buildChatNavigateHref } from "@/lib/chat-navigation";

const VIEW_MODE_STORAGE_KEY = "aichatdeck:conversation-list:view-mode";

type ConversationListViewMode = "list" | "cards";

export function ConversationList() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ConversationListViewMode>("list");
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const refresh = async () => {
    const items = await listConversations();
    setConversations(items);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (conversations.length === 0) {
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((current) => Math.min(current, conversations.length - 1));
  }, [conversations.length]);

  useEffect(() => {
    if (conversations.length === 0) return;
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-conversation-index="${selectedIndex}"]`,
    );
    row?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedIndex, conversations.length]);

  useEffect(() => {
    const savedMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (savedMode === "list" || savedMode === "cards") {
      setViewMode(savedMode);
      return;
    }

    const mobileDefault = window.matchMedia("(max-width: 767px)").matches;
    setViewMode(mobileDefault ? "cards" : "list");
  }, []);

  const openSelectedConversation = useCallback(() => {
    const conv = conversationsRef.current[selectedIndexRef.current];
    if (conv) router.push(`/chat/${conv.id}`);
  }, [router]);

  const menuBindings = useMemo<Keybinding[]>(
    () => [
      {
        id: "menu-up",
        chord: "arrowup",
        scope: "main-menu",
        when: () => conversationsRef.current.length > 0,
        handler: () => {
          setSelectedIndex((current) => Math.max(0, current - 1));
        },
      },
      {
        id: "menu-down",
        chord: "arrowdown",
        scope: "main-menu",
        when: () => conversationsRef.current.length > 0,
        handler: () => {
          setSelectedIndex((current) =>
            Math.min(conversationsRef.current.length - 1, current + 1),
          );
        },
      },
      {
        id: "menu-open",
        chord: "enter",
        scope: "main-menu",
        when: () => conversationsRef.current.length > 0,
        handler: openSelectedConversation,
      },
      {
        id: "menu-open-right",
        chord: "arrowright",
        scope: "main-menu",
        when: () => conversationsRef.current.length > 0,
        handler: openSelectedConversation,
      },
    ],
    [openSelectedConversation],
  );

  useKeybindings("main-menu", menuBindings);

  const selectedConversation = conversations[selectedIndex] ?? null;
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
      const conv = conversationsRef.current[selectedIndexRef.current];
      if (!conv) return;
      router.push(buildChatNavigateHref(conv.id, pageIndex, headingSlug));
    },
    [router],
  );

  const handleNew = async () => {
    const settings = await loadSettings();
    if (!hasConnectedProvider(settings)) {
      toast.error("Connect a provider in Settings before starting a chat");
      router.push("/settings");
      return;
    }

    if (!settings.defaultModel) {
      toast.error("Choose a default model in Settings");
      router.push("/settings");
      return;
    }

    const conv = await createConversation(
      "New conversation",
      encodeModelRef(settings.defaultModel),
    );
    router.push(`/chat/${conv.id}`);
  };

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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteConversation(id);
    toast.success("Conversation deleted");
    void refresh();
  };

  const handleViewModeChange = (nextMode: ConversationListViewMode) => {
    setViewMode(nextMode);
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, nextMode);
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

    return conversations.map((conv, index) => (
      <Link
        key={conv.id}
        href={`/chat/${conv.id}`}
        data-conversation-index={index}
        className={cn(
          mode === "list"
            ? "group flex items-center justify-between px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
            : "group flex min-w-[250px] max-w-[320px] flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:bg-zinc-900",
          selectedIndex === index &&
            "bg-blue-50 ring-2 ring-inset ring-blue-500/35 dark:bg-blue-500/10",
        )}
        onMouseEnter={() => setSelectedIndex(index)}
      >
        <div className="min-w-0">
          <p className="truncate font-medium">{conv.title}</p>
          <p className="text-xs text-zinc-500">
            {conv.messages.length} messages ·{" "}
            {new Date(conv.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            mode === "list" ? "opacity-0 group-hover:opacity-100" : "self-end",
          )}
          onClick={(e) => void handleDelete(conv.id, e)}
          aria-label="Delete conversation"
        >
          <Trash2 className="h-4 w-4 text-zinc-500" />
        </Button>
      </Link>
    ));
  };

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="z-40 flex h-[60px] shrink-0 items-center gap-3 border-b border-zinc-200/70 bg-white/80 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/70 md:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_4px_12px_-4px_rgba(37,99,235,0.5)]">
              💬
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold leading-none tracking-tight">
                AIChatDeck
              </h1>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                horizontal pages for long AI conversations
              </p>
            </div>
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

      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-4 md:px-6">
        {viewMode === "list" ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:gap-0 lg:grid-cols-[minmax(0,1fr)_260px]">
            <ScrollArea className="min-h-[320px] rounded-xl border border-zinc-200 dark:border-zinc-800 lg:min-h-0">
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
              className="min-h-[280px] rounded-xl border border-zinc-200 dark:border-zinc-800 lg:min-h-0 lg:border-r-0"
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <ScrollArea className="h-[150px] shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div ref={listRef} className="flex h-full w-max min-w-full items-stretch gap-3 p-3">
                {renderConversationItems("cards")}
              </div>
            </ScrollArea>

            <SessionOutlineSidebar
              mode="interactive"
              outline={selectedOutline}
              onSelectPage={handleOutlineNavigate}
              className="min-h-[320px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800"
            />
          </div>
        )}
      </div>
    </div>
  );
}