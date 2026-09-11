import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TaskCard } from '../../components/tasks/TaskCard';
import type { Task } from '../../types';

describe('TaskCard Component Tests', () => {
  const mockTask: Task = {
    id: 'task-001',
    title: 'Morning Toothbrush Quest',
    description: 'Brush for a full 2 minutes with timer',
    category: 'health',
    difficulty: 'easy',
    xp: 30,
    status: 'pending',
    assignedToUid: 'kid-1',
    assignedToName: 'Aarav',
    parentId: 'parent-1',
    dueDate: new Date('2026-10-20T10:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('renders task details (title, description, XP, difficulty, and status)', () => {
    const { getByText } = render(<TaskCard task={mockTask} />);

    expect(getByText('Morning Toothbrush Quest')).toBeTruthy();
    expect(getByText('Brush for a full 2 minutes with timer')).toBeTruthy();
    expect(getByText('+30 XP')).toBeTruthy();
    expect(getByText('Easy')).toBeTruthy();
    expect(getByText('To Do')).toBeTruthy();
  });

  it('displays assigned kid name when showKidName is true', () => {
    const { getByText } = render(<TaskCard task={mockTask} showKidName={true} />);
    expect(getByText(/Aarav/)).toBeTruthy();
  });

  it('calls onPress when user taps on the card', () => {
    const handlePress = jest.fn();
    const { getByText } = render(<TaskCard task={mockTask} onPress={handlePress} />);

    fireEvent.press(getByText('Morning Toothbrush Quest'));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('renders completed status badge correctly', () => {
    const completedTask: Task = {
      ...mockTask,
      status: 'completed',
    };

    const { getByText } = render(<TaskCard task={completedTask} />);
    expect(getByText('Done ✓')).toBeTruthy();
  });

  it('displays overdue warning when task is past due date', () => {
    const overdueTask: Task = {
      ...mockTask,
      dueDate: new Date('2020-01-01'), // past date
      status: 'pending',
    };

    const { getByText } = render(<TaskCard task={overdueTask} />);
    expect(getByText(/Overdue/)).toBeTruthy();
  });
});
