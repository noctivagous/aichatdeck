import { countConversations } from "@/lib/server/conversations";
import { getDbPath } from "@/lib/server/sqlite";

export async function GET(req: Request) {
  try {
    const conversationCount = await countConversations();
    const host = req.headers.get("host") ?? "localhost:3000";

    return Response.json({
      ok: true,
      dbPath: getDbPath(),
      conversationCount,
      accessUrl: `http://${host}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database unavailable";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}