import fs from "fs";
import path from "path";
import { ZipArchive } from "archiver";
import { PassThrough } from "stream";
import { Readable } from "stream";
import { listConversations } from "./conversations";
import { loadSettings } from "./settings";
import { getDbPath } from "./sqlite";

function formatExportStamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export async function createDatabaseExportZip(): Promise<{
  stream: Readable;
  filename: string;
}> {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    throw new Error("Database file not found");
  }

  const [conversations, settings] = await Promise.all([
    listConversations(),
    loadSettings(),
  ]);

  const exportedAt = new Date().toISOString();
  const manifest = {
    app: "AIChatDeck",
    exportedAt,
    dbFile: path.basename(dbPath),
    conversationCount: conversations.length,
  };

  const passThrough = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 9 } });

  archive.on("error", (error) => {
    passThrough.destroy(error);
  });

  archive.pipe(passThrough);
  archive.file(dbPath, { name: path.basename(dbPath) });
  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
  archive.append(JSON.stringify(conversations, null, 2), {
    name: "conversations.json",
  });
  archive.append(JSON.stringify(settings, null, 2), { name: "settings.json" });
  void archive.finalize();

  return {
    stream: passThrough,
    filename: `aichatdeck-export-${formatExportStamp(new Date(exportedAt))}.zip`,
  };
}