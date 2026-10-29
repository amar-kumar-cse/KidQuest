import { getExpoDb } from './index';
import { LocalTask, InsertLocalTask } from './schema';
import type { Task } from '../../types';

/**
 * Task Repository for SQLite local cache.
 * Translates between domain Task model and SQLite local_tasks row.
 */
export const taskRepository = {
  /**
   * Upsert a task received from Firestore or local creation.
   * If existing task has synced = false (local offline changes), preserve local unsynced fields!
   */
  async upsertTask(task: Partial<Task> & { id: string }, markSynced = true): Promise<void> {
    const existing = await this.getTaskById(task.id);

    // If local version has pending unsynced edits, do not let server overwrite dirty local fields
    const isLocalDirty = existing && !existing.synced;
    
    const row: InsertLocalTask = {
      id: task.id,
      parentId: task.parentId || (existing?.parentId ?? ''),
      assignedToUid: task.assignedToUid || (existing?.assignedToUid ?? ''),
      assignedToName: task.assignedToName || (existing?.assignedToName ?? null),
      title: isLocalDirty ? existing.title : (task.title || existing?.title || 'Untitled'),
      description: isLocalDirty ? existing.description : (task.description ?? existing?.description ?? null),
      category: task.category || existing?.category || 'general',
      difficulty: task.difficulty || existing?.difficulty || 'medium',
      xp: task.xp !== undefined ? task.xp : (existing?.xp ?? 10),
      status: isLocalDirty ? existing.status : (task.status || existing?.status || 'pending'),
      dueDate: task.dueDate ? (typeof task.dueDate === 'string' ? task.dueDate : (task.dueDate as any).toISOString ? (task.dueDate as any).toISOString() : String(task.dueDate)) : (existing?.dueDate ?? null),
      proofUrl: isLocalDirty ? existing.proofUrl : (task.proofUrl ?? existing?.proofUrl ?? null),
      proofNote: isLocalDirty ? existing.proofNote : (task.proofNote ?? existing?.proofNote ?? null),
      parentNote: task.parentNote ?? existing?.parentNote ?? null,
      completedAt: task.completedAt ? String(task.completedAt) : (existing?.completedAt ?? null),
      createdAt: task.createdAt ? String(task.createdAt) : (existing?.createdAt ?? new Date().toISOString()),
      updatedAt: new Date().toISOString(),
      synced: markSynced,
      version: (existing?.version ?? 0) + 1,
    };

    const sqlite = getExpoDb();
    sqlite.runSync(
      `INSERT OR REPLACE INTO local_tasks (
        id, parent_id, assigned_to_uid, assigned_to_name, title, description,
        category, difficulty, xp, status, due_date, proof_url, proof_note,
        parent_note, completed_at, created_at, updated_at, synced, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.parentId,
        row.assignedToUid,
        row.assignedToName ?? null,
        row.title,
        row.description ?? null,
        row.category ?? 'general',
        row.difficulty ?? 'medium',
        row.xp ?? 10,
        row.status ?? 'pending',
        row.dueDate ?? null,
        row.proofUrl ?? null,
        row.proofNote ?? null,
        row.parentNote ?? null,
        row.completedAt ?? null,
        row.createdAt ?? new Date().toISOString(),
        row.updatedAt ?? new Date().toISOString(),
        row.synced ? 1 : 0,
        row.version ?? 1,
      ]
    );
  },

  /**
   * Batch upsert tasks from Firestore sync.
   */
  async upsertBatch(tasks: Task[]): Promise<void> {
    for (const t of tasks) {
      await this.upsertTask(t, true);
    }
  },

  /**
   * Get all cached tasks for a user (either kid assignedToUid or parent parentId).
   */
  async getTasksForUser(uid: string, role: 'parent' | 'kid'): Promise<Task[]> {
    const sqlite = getExpoDb();
    const column = role === 'parent' ? 'parent_id' : 'assigned_to_uid';
    const rows = sqlite.getAllSync<any>(
      `SELECT * FROM local_tasks WHERE ${column} = ? ORDER BY created_at DESC`,
      [uid]
    );

    return rows.map((r) => this.mapRowToTask(r));
  },

  /**
   * Get single task by ID.
   */
  async getTaskById(taskId: string): Promise<LocalTask | null> {
    const sqlite = getExpoDb();
    const row = sqlite.getFirstSync<any>(
      `SELECT * FROM local_tasks WHERE id = ?`,
      [taskId]
    );
    if (!row) return null;
    return {
      ...row,
      synced: Boolean(row.synced),
    };
  },

  /**
   * Delete task by ID.
   */
  async deleteTask(taskId: string): Promise<void> {
    const sqlite = getExpoDb();
    sqlite.runSync(`DELETE FROM local_tasks WHERE id = ?`, [taskId]);
  },

  /**
   * Map SQLite row to domain Task type.
   */
  mapRowToTask(r: any): Task {
    return {
      id: r.id,
      parentId: r.parent_id,
      assignedToUid: r.assigned_to_uid,
      assignedToName: r.assigned_to_name,
      assignedTo: r.assigned_to_name,
      title: r.title,
      description: r.description,
      category: r.category,
      difficulty: r.difficulty,
      xp: r.xp,
      status: r.status,
      dueDate: r.due_date ? new Date(r.due_date) : new Date(),
      proofUrl: r.proof_url,
      proofNote: r.proof_note,
      parentNote: r.parent_note,
      completedAt: r.completed_at ? new Date(r.completed_at) : undefined,
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
      updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
    } as unknown as Task;
  },
};
