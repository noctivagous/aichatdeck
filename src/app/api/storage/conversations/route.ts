import {
  createConversation,
  listConversations,
} from "@/lib/server/conversations";

export async function GET() {
  try {
    const conversations = await listConversations();
    return Response.json(conversations);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list conversations";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title?: string;
      modelId?: string;
    };
    const conversation = await createConversation(
      body.title ?? "New conversation",
      body.modelId ?? "gpt-4o",
    );
    return Response.json(conversation, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create conversation";
    return Response.json({ error: message }, { status: 500 });
  }
}