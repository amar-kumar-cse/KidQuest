import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const ProblemChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test crash in child component');
  }
  return <Text>Child is happy</Text>;
};

describe('ErrorBoundary', () => {
  // Silence console.error for expected test crash
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('renders children when no error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText('Child is happy')).toBeTruthy();
  });

  it('catches render error and displays kid-friendly fallback UI', () => {
    const { getByText, getByRole } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByRole('alert')).toBeTruthy();
    expect(getByText('Quest Interrupted!')).toBeTruthy();
    expect(getByText(/progress and XP are safely saved/i)).toBeTruthy();
    expect(getByText('Try Again ⚔️')).toBeTruthy();
  });

  it('calls onReset callback when Try Again is pressed', () => {
    const onReset = jest.fn();
    const { getByText } = render(
      <ErrorBoundary onReset={onReset}>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.press(getByText('Try Again ⚔️'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

