import { createDefaultSettings, migrateSettings } from "@/lib/settings-core";
import type { AppSettings } from "@/lib/types";
import {
  getDatabase,
  selectOne,
  withPersist,
} from "./sqlite";

type SettingsRow = {
  id: string;
  payload: string;
  updated_at: number;
};

const SETTINGS_ID = "default";

export async function loadSettings(): Promise<AppSettings> {
  const database = await getDatabase();
  const row = selectOne<SettingsRow>(
    database,
    `SELECT id, payload, updated_at FROM app_settings WHERE id = ?`,
    [SETTINGS_ID],
  );

  if (!row) {
    const defaults = createDefaultSettings();
    await saveSettings(defaults);
    return defaults;
  }

  try {
    return migrateSettings(JSON.parse(row.payload));
  } catch {
    return createDefaultSettings();
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const now = Date.now();
  const payload = JSON.stringify(settings);

  await withPersist((database) => {
    database.run(
      `INSERT INTO app_settings (id, payload, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      [SETTINGS_ID, payload, now],
    );
  });
}