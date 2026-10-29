import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * ─── Local Tasks Table ────────────────────────────────────────────────────────
 * Mirrors Firestore Tasks collection with offline caching & sync tracking.
 *
 * Conflict Resolution Rationale:
 * - Server-Authoritative: status transitions ('completed', XP / reward awards)
 *   MUST be verified by Firebase Functions / Rules to prevent cheating.
 * - Last-Write-Wins (LWW): Task field edits (title, description, due date)
 *   and kid draft notes use updated_at timestamp reconciliation.
 */
export const localTasks = sqliteTable('local_tasks', {
  id: text('id').primaryKey(),
  parentId: text('parent_id').notNull(),
  assignedToUid: text('assigned_to_uid').notNull(),
  assignedToName: text('assigned_to_name'),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').default('general'),
  difficulty: text('difficulty').default('medium'),
  xp: integer('xp').notNull().default(10),
  status: text('status').notNull().default('pending'), // 'pending' | 'pending_approval' | 'completed' | 'rejected'
  dueDate: text('due_date'), // ISO string
  proofUrl: text('proof_url'),
  proofNote: text('proof_note'),
  parentNote: text('parent_note'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  synced: integer('synced', { mode: 'boolean' }).notNull().default(true),
  version: integer('version').notNull().default(1),
});

/**
 * ─── Sync Queue Table ─────────────────────────────────────────────────────────
 * Stores pending offline mutations with exponential backoff retry metadata.
 */
export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(), // unique action id
  actionType: text('action_type').notNull(), // 'CREATE_TASK' | 'SUBMIT_PROOF' | 'UPDATE_TASK' | 'DELETE_TASK'
  entityId: text('entity_id').notNull(), // e.g. taskId
  payload: text('payload').notNull(), // JSON string
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(5),
  status: text('status').notNull().default('pending'), // 'pending' | 'processing' | 'failed'
  lastAttemptAt: integer('last_attempt_at'), // timestamp in ms
  errorMessage: text('error_message'),
  createdAt: integer('created_at').notNull(), // timestamp in ms
});

/**
 * ─── Cached Profiles Table ───────────────────────────────────────────────────
 * Caches parent and kid profiles locally for instant zero-latency app startup.
 */
export const cachedProfiles = sqliteTable('cached_profiles', {
  uid: text('uid').primaryKey(),
  role: text('role').notNull(), // 'parent' | 'kid'
  data: text('data').notNull(), // JSON payload
  updatedAt: integer('updated_at').notNull(),
});

export type LocalTask = typeof localTasks.$inferSelect;
export type InsertLocalTask = typeof localTasks.$inferInsert;
export type SyncQueueItem = typeof syncQueue.$inferSelect;
export type InsertSyncQueueItem = typeof syncQueue.$inferInsert;
export type CachedProfile = typeof cachedProfiles.$inferSelect;

