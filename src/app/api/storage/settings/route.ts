import { loadSettings, saveSettings } from "@/lib/server/settings";
import { migrateSettings } from "@/lib/settings-core";
import type { AppSettings } from "@/lib/types";

export async function GET() {
  try {
    const settings = await loadSettings();
    return Response.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load settings";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const raw = await req.json();
    const settings = migrateSettings(raw) as AppSettings;
    await saveSettings(settings);
    return Response.json(settings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save settings";
    return Response.json({ error: message }, { status: 500 });
  }
}