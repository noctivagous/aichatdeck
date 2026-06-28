import {
  deleteConversation,
  getConversation,
  updateConversation,
} from "@/lib/server/conversations";
import type { ConversationRecord } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const conversation = await getConversation(id);
    if (!conversation) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }
    return Response.json(conversation);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load conversation";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const patch = (await req.json()) as Partial<
      Pick<
        ConversationRecord,
        "title" | "modelId" | "messages" | "pageBreaks" | "focusedPageIndex"
      >
    >;
    const existing = await getConversation(id);
    if (!existing) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }
    await updateConversation(id, patch);
    const conversation = await getConversation(id);
    return Response.json(conversation);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update conversation";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const existing = await getConversation(id);
    if (!existing) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }
    await deleteConversation(id);
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete conversation";
    return Response.json({ error: message }, { status: 500 });
  }
}