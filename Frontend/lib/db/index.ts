import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const DB_NAME = 'kidquest_local.db';

// Open synchronous SQLite database connection
let expoDbInstance: ReturnType<typeof openDatabaseSync> | null = null;

export function getExpoDb() {
  if (!expoDbInstance) {
    expoDbInstance = openDatabaseSync(DB_NAME);
  }
  return expoDbInstance;
}

export const db = drizzle(getExpoDb(), { schema });

/**
 * Initialize SQLite database tables safely with IF NOT EXISTS.
 * Executed on app launch to ensure local tables are ready.
 */
export async function initDatabase(): Promise<void> {
  const sqlite = getExpoDb();
  
  sqlite.execSync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS local_tasks (
      id TEXT PRIMARY KEY NOT NULL,
      parent_id TEXT NOT NULL,
      assigned_to_uid TEXT NOT NULL,
      assigned_to_name TEXT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      difficulty TEXT DEFAULT 'medium',
      xp INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'pending',
      due_date TEXT,
      proof_url TEXT,
      proof_note TEXT,
      parent_note TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      action_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 5,
      status TEXT NOT NULL DEFAULT 'pending',
      last_attempt_at INTEGER,
      error_message TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_profiles (
      uid TEXT PRIMARY KEY NOT NULL,
      role TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_parent ON local_tasks(parent_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON local_tasks(assigned_to_uid);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);
  `);
}

export { schema };

