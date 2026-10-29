import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LanguageToggle } from '../../components/ui/LanguageToggle';
import { Text } from 'react-native';

describe('Accessible UI Components (Design Tokens & WCAG)', () => {
  describe('Button', () => {
    it('renders with accessibilityRole="button" and minimum 44px height', () => {
      const onPressMock = jest.fn();
      const { getByRole, getByText } = render(
        <Button title="Save Quest" onPress={onPressMock} />
      );

      const button = getByRole('button');
      expect(button).toBeTruthy();
      expect(getByText('Save Quest')).toBeTruthy();

      fireEvent.press(button);
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('shows loading indicator and disables press when isLoading is true', () => {
      const onPressMock = jest.fn();
      const { getByLabelText, queryByText } = render(
        <Button title="Submitting" isLoading={true} onPress={onPressMock} />
      );

      expect(getByLabelText('Loading')).toBeTruthy();
      expect(queryByText('Submitting')).toBeNull();

      fireEvent.press(getByLabelText('Loading'));
      expect(onPressMock).not.toHaveBeenCalled();
    });
  });

  describe('Input', () => {
    it('renders label, input, and accessibility attributes', () => {
      const { getByText, getByPlaceholderText } = render(
        <Input
          label="Quest Name"
          placeholder="e.g. Read Chapter 1"
          hint="Must be at least 3 characters"
        />
      );

      expect(getByText('Quest Name')).toBeTruthy();
      expect(getByPlaceholderText('e.g. Read Chapter 1')).toBeTruthy();
      expect(getByText('Must be at least 3 characters')).toBeTruthy();
    });

    it('toggles password visibility with accessible button', () => {
      const { getByLabelText } = render(
        <Input label="Secret PIN" secureTextEntry={true} />
      );

      const toggleBtn = getByLabelText('Show password');
      expect(toggleBtn).toBeTruthy();

      fireEvent.press(toggleBtn);
      expect(getByLabelText('Hide password')).toBeTruthy();
    });
  });

  describe('Modal', () => {
    it('renders modal content and accessible close button', () => {
      const onCloseMock = jest.fn();
      const { getByText, getByLabelText } = render(
        <Modal visible={true} onClose={onCloseMock} title="Quest Reward">
          <Text>You unlocked a gold badge!</Text>
        </Modal>
      );

      expect(getByText('Quest Reward')).toBeTruthy();
      expect(getByText('You unlocked a gold badge!')).toBeTruthy();

      const closeBtn = getByLabelText('Close dialog');
      fireEvent.press(closeBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('EmptyState', () => {
    it('renders icon, title, and descriptive message', () => {
      const { getByText } = render(
        <EmptyState
          icon="🗺️"
          title="No Quests Found"
          message="Time to create your first adventure."
        />
      );

      expect(getByText('🗺️')).toBeTruthy();
      expect(getByText('No Quests Found')).toBeTruthy();
      expect(getByText('Time to create your first adventure.')).toBeTruthy();
    });
  });

  describe('ErrorState', () => {
    it('renders alert role and triggers onRetry', () => {
      const onRetryMock = jest.fn();
      const { getByRole, getByText } = render(
        <ErrorState
          title="Connection Failure"
          message="Could not connect to Firebase"
          onRetry={onRetryMock}
        />
      );

      expect(getByRole('alert')).toBeTruthy();
      expect(getByText('Connection Failure')).toBeTruthy();

      const retryBtn = getByText('Try Again');
      fireEvent.press(retryBtn);
      expect(onRetryMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('LanguageToggle', () => {
    it('renders accessible language selector with EN and हिन्दी', () => {
      const { getByText, getByLabelText } = render(<LanguageToggle />);

      expect(getByLabelText('Language selection')).toBeTruthy();
      expect(getByText('EN')).toBeTruthy();
      expect(getByText('हिन्दी')).toBeTruthy();
    });
  });
});

