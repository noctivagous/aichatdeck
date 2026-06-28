import fs from "fs";
import path from "path";
import initSqlJs, { type Database } from "sql.js";

const DB_PATH =
  process.env.AICHATDECK_DB_PATH ??
  path.join(/* turbopackIgnore: true */ process.cwd(), "data", "aichatdeck.db");
const DB_DIR = path.dirname(DB_PATH);
const WASM_PATH = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "node_modules",
  "sql.js",
  "dist",
  "sql-wasm.wasm",
);

let db: Database | null = null;
let initPromise: Promise<Database> | null = null;
let operationChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => T | Promise<T>): Promise<T> {
  const result = operationChain.then(fn) as Promise<T>;
  operationChain = result.catch(() => undefined);
  return result;
}

function initSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      model_id TEXT NOT NULL,
      messages TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  database.run(`
    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
    ON conversations(updated_at DESC)
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  migrateSchema(database);
}

function migrateSchema(database: Database) {
  const columns = selectAll<{ name: string }>(
    database,
    `PRAGMA table_info(conversations)`,
  );
  if (!columns.some((column) => column.name === "page_breaks")) {
    database.run(
      `ALTER TABLE conversations ADD COLUMN page_breaks TEXT NOT NULL DEFAULT '[]'`,
    );
  }
  if (!columns.some((column) => column.name === "focused_page_index")) {
    database.run(
      `ALTER TABLE conversations ADD COLUMN focused_page_index INTEGER NOT NULL DEFAULT 0`,
    );
  }
}

function persist(database: Database) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(database.export()));
}

export function getDbPath() {
  return DB_PATH;
}

async function openDatabase(): Promise<Database> {
  if (db) return db;

  if (!initPromise) {
    initPromise = (async () => {
      const SQL = await initSqlJs({
        locateFile: () => WASM_PATH,
      });

      const database = fs.existsSync(DB_PATH)
        ? new SQL.Database(fs.readFileSync(DB_PATH))
        : new SQL.Database();

      initSchema(database);
      persist(database);
      db = database;
      return database;
    })();
  }

  return initPromise;
}

export async function getDatabase(): Promise<Database> {
  return enqueue(() => openDatabase());
}

export async function withPersist<T>(
  fn: (database: Database) => T,
): Promise<T> {
  return enqueue(async () => {
    const database = await openDatabase();
    const result = fn(database);
    persist(database);
    return result;
  });
}

export function selectOne<T extends Record<string, unknown>>(
  database: Database,
  sql: string,
  params: (string | number | null)[] = [],
): T | undefined {
  const stmt = database.prepare(sql);
  try {
    stmt.bind(params);
    if (stmt.step()) {
      return stmt.getAsObject() as T;
    }
    return undefined;
  } finally {
    stmt.free();
  }
}

export function selectAll<T extends Record<string, unknown>>(
  database: Database,
  sql: string,
  params: (string | number | null)[] = [],
): T[] {
  const stmt = database.prepare(sql);
  const rows: T[] = [];
  try {
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}