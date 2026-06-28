"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Plus, MessageSquare, Settings, Trash2 } from "lucide-react";
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

export function ConversationList() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const refresh = async () => {
    const items = await listConversations();
    setConversations(items);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

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

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AIChatDeck</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Horizontal pages for long AI conversations
          </p>
        </div>
        <div className="flex gap-2">
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
          <Button onClick={() => void handleNew()}>
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {loading ? (
            <div className="p-6 text-sm text-zinc-500">Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
              <p className="text-sm text-zinc-500">No conversations yet</p>
              <Button className="mt-4" onClick={() => void handleNew()}>
                Start your first chat
              </Button>
            </div>
          ) : (
            conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className="group flex items-center justify-between px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
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
                  className="opacity-0 group-hover:opacity-100"
                  onClick={(e) => void handleDelete(conv.id, e)}
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-4 w-4 text-zinc-500" />
                </Button>
              </Link>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}