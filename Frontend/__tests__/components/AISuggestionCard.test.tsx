import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AISuggestionCard } from '../../components/AISuggestionCard';

describe('AISuggestionCard Component Tests', () => {
  it('renders loading state when isLoading is true', () => {
    const { getByTestId, getByText } = render(
      <AISuggestionCard isLoading={true} />
    );

    expect(getByTestId('ai-suggestion-loading')).toBeTruthy();
    expect(getByTestId('ai-loading-indicator')).toBeTruthy();
    expect(getByText('Generating smart study recommendations...')).toBeTruthy();
  });

  it('renders error state with error message and calls onRetry when clicked', () => {
    const handleRetry = jest.fn();
    const { getByTestId, getByText } = render(
      <AISuggestionCard
        isLoading={false}
        error="Network timeout reaching AI engine"
        onRetry={handleRetry}
      />
    );

    expect(getByTestId('ai-suggestion-error')).toBeTruthy();
    expect(getByText('Failed to load suggestions')).toBeTruthy();
    expect(getByText('Network timeout reaching AI engine')).toBeTruthy();

    const retryButton = getByTestId('ai-retry-button');
    expect(retryButton).toBeTruthy();

    fireEvent.press(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders data state with AI study recommendations', () => {
    const suggestions = [
      'Review science flashcards for 15 minutes',
      'Take a 5-minute stretch break before math homework',
      'Read 2 chapters of the adventure book',
    ];

    const { getByTestId, getByText } = render(
      <AISuggestionCard
        isLoading={false}
        error={null}
        suggestions={suggestions}
      />
    );

    expect(getByTestId('ai-suggestion-card')).toBeTruthy();
    expect(getByText('Review science flashcards for 15 minutes')).toBeTruthy();
    expect(getByText('Take a 5-minute stretch break before math homework')).toBeTruthy();
    expect(getByText('Read 2 chapters of the adventure book')).toBeTruthy();
  });

  it('renders empty fallback when suggestions array is empty', () => {
    const { getByTestId, getByText } = render(
      <AISuggestionCard
        isLoading={false}
        error={null}
        suggestions={[]}
      />
    );

    expect(getByTestId('ai-suggestion-empty')).toBeTruthy();
    expect(getByText('No recommendations available at this time.')).toBeTruthy();
  });
});
