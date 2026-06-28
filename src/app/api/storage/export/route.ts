import { Readable } from "stream";
import { createDatabaseExportZip } from "@/lib/server/export-database";

export async function GET() {
  try {
    const { stream, filename } = await createDatabaseExportZip();

    const body = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

    return new Response(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to export database";
    return Response.json({ error: message }, { status: 500 });
  }
}