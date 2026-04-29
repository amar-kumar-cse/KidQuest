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
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()), // returns unsubscribe function
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  Timestamp: { fromDate: jest.fn((d: Date) => d) },
}));

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(() => jest.fn().mockResolvedValue({ data: { success: true } })),
}));

describe('taskService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createTask', () => {
    it('creates a task and returns its ID', async () => {
      const id = await taskService.createTask('parent-uid', {
        title: 'Clean Room',
        description: 'Make your bed and vacuum the floor',
        category: 'chores',
        difficulty: 'easy',
        xp: 50,
        assignedToUid: 'kid-uid',
        assignedToName: 'Riya',
        dueDate: new Date('2025-12-31'),
      });
      expect(id).toBe('task-123');
    });
  });

  describe('deleteTask', () => {
    it('calls deleteDoc with correct task id', async () => {
      const { deleteDoc } = require('firebase/firestore');
      await taskService.deleteTask('task-abc');
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe('approveTask', () => {
    it('calls the approveTask Cloud Function', async () => {
      const { httpsCallable } = require('firebase/functions');
      await taskService.approveTask('task-123', 10);
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'approveTask');
    });
  });
});
