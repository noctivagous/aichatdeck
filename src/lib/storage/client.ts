import type { UIMessage } from "ai";
import type { AppSettings, ConversationRecord } from "@/lib/types";

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data && data.error
        ? data.error
        : `Request failed (${res.status})`,
    );
  }
  return data;
}

export async function listConversations(): Promise<ConversationRecord[]> {
  const res = await fetch("/api/storage/conversations", { cache: "no-store" });
  return parseJson<ConversationRecord[]>(res);
}

export async function getConversation(
  id: string,
): Promise<ConversationRecord | undefined> {
  const res = await fetch(`/api/storage/conversations/${id}`, {
    cache: "no-store",
  });
  if (res.status === 404) return undefined;
  return parseJson<ConversationRecord>(res);
}

export async function createConversation(
  title = "New conversation",
  modelId = "gpt-4o",
): Promise<ConversationRecord> {
  const res = await fetch("/api/storage/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, modelId }),
  });
  return parseJson<ConversationRecord>(res);
}

export async function updateConversation(
  id: string,
  patch: Partial<
    Pick<
      ConversationRecord,
      | "title"
      | "modelId"
      | "messages"
      | "pageBreaks"
      | "sealedPageIndices"
      | "activePageIndex"
      | "focusedPageIndex"
    >
  >,
  options?: { keepalive?: boolean },
): Promise<void> {
  const res = await fetch(`/api/storage/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
    keepalive: options?.keepalive,
  });
  await parseJson<ConversationRecord>(res);
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`/api/storage/conversations/${id}`, {
    method: "DELETE",
  });
  await parseJson<{ ok: boolean }>(res);
}

export async function saveMessages(
  id: string,
  messages: UIMessage[],
): Promise<void> {
  await updateConversation(id, { messages });
}

export function conversationTitleFromMessages(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New conversation";
  const text = firstUser.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();
  if (!text) return "New conversation";
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

export async function loadSettings(): Promise<AppSettings> {
  const res = await fetch("/api/storage/settings", { cache: "no-store" });
  return parseJson<AppSettings>(res);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const res = await fetch("/api/storage/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  await parseJson<AppSettings>(res);
}

export type StorageHealth = {
  ok: boolean;
  dbPath?: string;
  conversationCount?: number;
  accessUrl?: string;
  error?: string;
};

export async function fetchStorageHealth(): Promise<StorageHealth> {
  const res = await fetch("/api/storage/health", { cache: "no-store" });
  return parseJson<StorageHealth>(res);
}

export async function downloadDatabaseExport(): Promise<void> {
  const res = await fetch("/api/storage/export", { cache: "no-store" });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `Export failed (${res.status})`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? "aichatdeck-export.zip";

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}