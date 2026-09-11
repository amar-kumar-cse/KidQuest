import { useTaskStore } from '../../store/taskStore';
import type { Task } from '../../types';

describe('useTaskStore (Zustand) Unit Tests', () => {
  const sampleTask1: Task = {
    id: 't-1',
    title: 'Clean Room',
    description: 'Fold blankets',
    category: 'chores',
    difficulty: 'easy',
    xp: 50,
    status: 'pending',
    assignedToUid: 'kid-1',
    assignedToName: 'Leo',
    parentId: 'parent-1',
    dueDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleTask2: Task = {
    id: 't-2',
    title: 'Math Worksheet',
    description: 'Fractions',
    category: 'homework',
    difficulty: 'medium',
    xp: 100,
    status: 'completed',
    assignedToUid: 'kid-1',
    assignedToName: 'Leo',
    parentId: 'parent-1',
    dueDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset store state before each test
    useTaskStore.setState({ tasks: [], isLoading: false });
  });

  it('initializes with empty tasks and false loading state', () => {
    const state = useTaskStore.getState();
    expect(state.tasks).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it('updates tasks array with setTasks', () => {
    useTaskStore.getState().setTasks([sampleTask1, sampleTask2]);
    expect(useTaskStore.getState().tasks).toHaveLength(2);
    expect(useTaskStore.getState().tasks[0].id).toBe('t-1');
  });

  it('updates loading flag with setLoading', () => {
    useTaskStore.getState().setLoading(true);
    expect(useTaskStore.getState().isLoading).toBe(true);
    useTaskStore.getState().setLoading(false);
    expect(useTaskStore.getState().isLoading).toBe(false);
  });

  it('prepends new task with addTask', () => {
    useTaskStore.getState().setTasks([sampleTask2]);
    useTaskStore.getState().addTask(sampleTask1);

    const tasks = useTaskStore.getState().tasks;
    expect(tasks).toHaveLength(2);
    expect(tasks[0].id).toBe('t-1');
  });

  it('mutates target task properties with updateTask', () => {
    useTaskStore.getState().setTasks([sampleTask1]);
    useTaskStore.getState().updateTask('t-1', { title: 'Deep Clean Room', xp: 75 });

    const updated = useTaskStore.getState().tasks.find((t) => t.id === 't-1');
    expect(updated?.title).toBe('Deep Clean Room');
    expect(updated?.xp).toBe(75);
  });

  it('marks task as completed with completeTask', () => {
    useTaskStore.getState().setTasks([sampleTask1]);
    useTaskStore.getState().completeTask('t-1');

    const completed = useTaskStore.getState().tasks.find((t) => t.id === 't-1');
    expect(completed?.status).toBe('completed');
    expect(completed?.completedAt).toBeDefined();
  });

  it('removes target task from array with deleteTask', () => {
    useTaskStore.getState().setTasks([sampleTask1, sampleTask2]);
    useTaskStore.getState().deleteTask('t-1');

    const tasks = useTaskStore.getState().tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('t-2');
  });

  it('filters pending and completed tasks accurately via selectors', () => {
    const pendingApprovalTask: Task = {
      ...sampleTask1,
      id: 't-3',
      status: 'pending_approval',
    };

    useTaskStore.getState().setTasks([sampleTask1, sampleTask2, pendingApprovalTask]);

    expect(useTaskStore.getState().getPendingTasks()).toHaveLength(1);
    expect(useTaskStore.getState().getPendingTasks()[0].id).toBe('t-1');

    expect(useTaskStore.getState().getCompletedTasks()).toHaveLength(1);
    expect(useTaskStore.getState().getCompletedTasks()[0].id).toBe('t-2');

    expect(useTaskStore.getState().getPendingApprovals()).toHaveLength(1);
    expect(useTaskStore.getState().getPendingApprovals()[0].id).toBe('t-3');
  });
});
