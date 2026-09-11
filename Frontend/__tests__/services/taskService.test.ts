import { taskService } from '../../services/taskService';

// Mock Firebase modules
jest.mock('../../lib/firebase', () => ({
  db: {},
  storage: {},
  functions: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: 'task-123' }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  doc: jest.fn((db, col, id) => ({ id, col })),
  query: jest.fn((col, ...clauses) => ({ col, clauses })),
  where: jest.fn((field, op, val) => ({ field, op, val })),
  orderBy: jest.fn((field, dir) => ({ field, dir })),
  limit: jest.fn((num) => ({ num })),
  onSnapshot: jest.fn(() => jest.fn()), // returns unsubscribe function
  getDocs: jest.fn().mockResolvedValue({
    docs: [
      {
        id: 'task-101',
        data: () => ({
          title: 'Math Homework',
          assignedToUid: 'kid-123',
          status: 'pending',
          xp: 100,
        }),
      },
      {
        id: 'task-102',
        data: () => ({
          title: 'Read 20 mins',
          assignedToUid: 'kid-123',
          status: 'completed',
          xp: 50,
        }),
      },
    ],
  }),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  Timestamp: { fromDate: jest.fn((d: Date) => d) },
}));

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(() => jest.fn().mockResolvedValue({ data: { success: true } })),
}));

describe('taskService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask()', () => {
    it('creates a new task with pending status and returns generated doc ID', async () => {
      const { addDoc } = require('firebase/firestore');

      const taskId = await taskService.createTask('parent-456', {
        title: 'Clean Room',
        description: 'Make bed and vacuum floor',
        category: 'chores',
        difficulty: 'easy',
        xp: 50,
        assignedToUid: 'kid-123',
        assignedToName: 'Leo',
        dueDate: new Date('2026-10-15'),
      });

      expect(taskId).toBe('task-123');
      expect(addDoc).toHaveBeenCalledTimes(1);
      expect(addDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          title: 'Clean Room',
          parentId: 'parent-456',
          assignedToUid: 'kid-123',
          status: 'pending',
          xp: 50,
        })
      );
    });
  });

  describe('completeTask()', () => {
    it('marks task as completed with completion timestamp', async () => {
      const { updateDoc } = require('firebase/firestore');

      await taskService.completeTask('task-101');

      expect(updateDoc).toHaveBeenCalledTimes(1);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'task-101' }),
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.anything(),
          updatedAt: expect.anything(),
        })
      );
    });
  });

  describe('getTasksByUser()', () => {
    it('queries tasks for specific user and maps result documents', async () => {
      const { getDocs, query, where } = require('firebase/firestore');

      const tasks = await taskService.getTasksByUser('kid-123');

      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('assignedToUid', '==', 'kid-123');
      expect(getDocs).toHaveBeenCalledTimes(1);
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toEqual(
        expect.objectContaining({
          id: 'task-101',
          title: 'Math Homework',
          assignedToUid: 'kid-123',
        })
      );
    });
  });

  describe('deleteTask()', () => {
    it('calls deleteDoc with specified task ID', async () => {
      const { deleteDoc } = require('firebase/firestore');
      await taskService.deleteTask('task-abc');
      expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-abc' }));
    });
  });

  describe('approveTask()', () => {
    it('invokes completeTaskTransaction cloud function', async () => {
      const { httpsCallable } = require('firebase/functions');
      await taskService.approveTask('task-123', 'kid-123');
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'completeTaskTransaction');
    });
  });
});
