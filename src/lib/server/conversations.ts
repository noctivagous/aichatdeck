import type { UIMessage } from "ai";
import type { ConversationRecord } from "@/lib/types";
import { normalizeConversationPageState } from "@/lib/pages";
import {
  getDatabase,
  selectAll,
  selectOne,
  withPersist,
} from "./sqlite";

type ConversationRow = {
  id: string;
  title: string;
  model_id: string;
  messages: string;
  page_breaks?: string;
  sealed_page_indices?: string;
  active_page_index?: number;
  focused_page_index?: number;
  created_at: number;
  updated_at: number;
};

function parsePageBreaks(raw: string | undefined): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0);
  } catch {
    return [];
  }
}

function parsePageIndices(raw: string | undefined): number[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0);
  } catch {
    return undefined;
  }
}

function parseFocusedPageIndex(raw: number | undefined): number {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) return 0;
  return raw;
}

function parseActivePageIndex(raw: number | undefined): number | undefined {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) {
    return undefined;
  }
  return raw;
}

function rowToRecord(row: ConversationRow): ConversationRecord {
  const messages = JSON.parse(row.messages) as UIMessage[];
  const pageState = normalizeConversationPageState(
    messages,
    parsePageBreaks(row.page_breaks),
    parsePageIndices(row.sealed_page_indices),
    parseActivePageIndex(row.active_page_index),
  );

  return {
    id: row.id,
    title: row.title,
    modelId: row.model_id,
    messages,
    pageBreaks: pageState.pageBreaks,
    sealedPageIndices: pageState.sealedPageIndices,
    activePageIndex: pageState.activePageIndex,
    focusedPageIndex: parseFocusedPageIndex(row.focused_page_index),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const CONVERSATION_SELECT = `SELECT id, title, model_id, messages, page_breaks, sealed_page_indices, active_page_index, focused_page_index, created_at, updated_at`;

export async function listConversations(): Promise<ConversationRecord[]> {
  const database = await getDatabase();
  const rows = selectAll<ConversationRow>(
    database,
    `${CONVERSATION_SELECT}
     FROM conversations
     ORDER BY updated_at DESC`,
  );
  return rows.map(rowToRecord);
}

export async function getConversation(
  id: string,
): Promise<ConversationRecord | undefined> {
  const database = await getDatabase();
  const row = selectOne<ConversationRow>(
    database,
    `${CONVERSATION_SELECT}
     FROM conversations
     WHERE id = ?`,
    [id],
  );
  return row ? rowToRecord(row) : undefined;
}

export async function createConversation(
  title = "New conversation",
  modelId = "gpt-4o",
): Promise<ConversationRecord> {
  const now = Date.now();
  const record: ConversationRecord = {
    id: crypto.randomUUID(),
    title,
    modelId,
    messages: [],
    pageBreaks: [],
    sealedPageIndices: [],
    activePageIndex: 0,
    focusedPageIndex: 0,
    createdAt: now,
    updatedAt: now,
  };

  await withPersist((database) => {
    database.run(
      `INSERT INTO conversations (id, title, model_id, messages, page_breaks, sealed_page_indices, active_page_index, focused_page_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.title,
        record.modelId,
        JSON.stringify(record.messages),
        JSON.stringify(record.pageBreaks),
        JSON.stringify(record.sealedPageIndices),
        record.activePageIndex,
        record.focusedPageIndex,
        record.createdAt,
        record.updatedAt,
      ],
    );
  });

  return record;
}

function resolveMessages(
  existing: UIMessage[],
  incoming: UIMessage[] | undefined,
): UIMessage[] {
  if (!incoming) return existing;
  if (
    incoming.length < existing.length &&
    incoming.every((message, index) => message.id === existing[index]?.id)
  ) {
    return existing;
  }
  return incoming;
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
): Promise<void> {
  await withPersist((database) => {
    const row = selectOne<ConversationRow>(
      database,
      `${CONVERSATION_SELECT}
       FROM conversations
       WHERE id = ?`,
      [id],
    );
    if (!row) return;

    const existing = rowToRecord(row);
    const nextMessages = resolveMessages(existing.messages, patch.messages);
    const pageState = normalizeConversationPageState(
      nextMessages,
      patch.pageBreaks ?? existing.pageBreaks,
      patch.sealedPageIndices ?? existing.sealedPageIndices,
      patch.activePageIndex ?? existing.activePageIndex,
    );

    const next: ConversationRecord = {
      ...existing,
      ...patch,
      messages: nextMessages,
      pageBreaks: pageState.pageBreaks,
      sealedPageIndices: pageState.sealedPageIndices,
      activePageIndex: pageState.activePageIndex,
      focusedPageIndex: parseFocusedPageIndex(
        patch.focusedPageIndex ?? existing.focusedPageIndex,
      ),
      updatedAt: Date.now(),
    };

    database.run(
      `UPDATE conversations
       SET title = ?, model_id = ?, messages = ?, page_breaks = ?, sealed_page_indices = ?, active_page_index = ?, focused_page_index = ?, updated_at = ?
       WHERE id = ?`,
      [
        next.title,
        next.modelId,
        JSON.stringify(next.messages),
        JSON.stringify(next.pageBreaks),
        JSON.stringify(next.sealedPageIndices),
        next.activePageIndex,
        next.focusedPageIndex,
        next.updatedAt,
        id,
      ],
    );
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await withPersist((database) => {
    database.run(`DELETE FROM conversations WHERE id = ?`, [id]);
  });
}

export async function countConversations(): Promise<number> {
  const database = await getDatabase();
  const row = selectOne<{ count: number }>(
    database,
    `SELECT COUNT(*) as count FROM conversations`,
  );
  return row?.count ?? 0;
}