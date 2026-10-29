import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { parentalGateService, type MathChallenge } from '../../services/parentalGateService';
import { useAppStore } from '../../store/useAppStore';

interface ParentalGateModalProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  reason?: string;
  mode?: 'verify' | 'set-pin';
}

export function ParentalGateModal({
  visible,
  onSuccess,
  onCancel,
  title = 'Parental Gate 🛡️',
  reason = 'Adult verification required to continue.',
  mode = 'verify',
}: ParentalGateModalProps) {
  const { user } = useAppStore();
  const parentUid = user?.uid || '';

  const [activeTab, setActiveTab] = useState<'pin' | 'math' | 'set-pin'>(
    mode === 'set-pin' ? 'set-pin' : 'pin'
  );
  const [hasPin, setHasPin] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
  const [mathChallenge, setMathChallenge] = useState<MathChallenge>({ question: '', answer: 0 });
  const [mathInput, setMathInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setError('');
      setEnteredPin('');
      setConfirmPin('');
      setPinStep('create');
      setMathInput('');

      parentalGateService.hasPinSet(parentUid).then((isSet) => {
        setHasPin(isSet);
        if (mode === 'set-pin') {
          setActiveTab('set-pin');
        } else if (isSet) {
          setActiveTab('pin');
        } else {
          // If no PIN is configured, default to math challenge
          setActiveTab('math');
          setMathChallenge(parentalGateService.generateMathChallenge());
        }
      });
    }
  }, [visible, parentUid, mode]);

  const handleKeyPress = (num: string) => {
    setError('');
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + num;
      setEnteredPin(nextPin);

      // Auto-submit when 4th digit entered
      if (nextPin.length === 4) {
        if (activeTab === 'pin') {
          verifyEnteredPin(nextPin);
        } else if (activeTab === 'set-pin') {
          if (pinStep === 'create') {
            setPinStep('confirm');
          } else {
            finalizePinSetup(confirmPin, nextPin);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setError('');
    if (enteredPin.length > 0) {
      setEnteredPin(enteredPin.slice(0, -1));
    }
  };

  const verifyEnteredPin = async (pinToVerify: string) => {
    const ok = await parentalGateService.verifyPin(parentUid, pinToVerify);
    if (ok) {
      setEnteredPin('');
      onSuccess();
    } else {
      setError('Incorrect PIN. Please try again.');
      setEnteredPin('');
    }
  };

  const finalizePinSetup = async (initialPin: string, retypedPin: string) => {
    if (initialPin !== retypedPin) {
      setError('PINs do not match. Start over.');
      setEnteredPin('');
      setConfirmPin('');
      setPinStep('create');
      return;
    }

    try {
      await parentalGateService.setParentPin(parentUid, retypedPin);
      setEnteredPin('');
      setConfirmPin('');
      setHasPin(true);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to save PIN.');
      setEnteredPin('');
    }
  };

  const handleMathSubmit = () => {
    setError('');
    const ok = parentalGateService.verifyMathChallenge(mathInput, mathChallenge.answer);
    if (ok) {
      setMathInput('');
      onSuccess();
    } else {
      setError('Incorrect answer. Try this one:');
      setMathChallenge(parentalGateService.generateMathChallenge());
      setMathInput('');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/60 items-center justify-center p-6"
      >
        <View className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100">
          {/* Header */}
          <View className="items-center mb-4">
            <View className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl items-center justify-center mb-3">
              <Text className="text-3xl">🛡️</Text>
            </View>
            <Text className="text-xl font-black text-slate-800 text-center">{title}</Text>
            <Text className="text-xs text-slate-500 text-center mt-1 px-2">{reason}</Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 mb-4">
              <Text className="text-rose-700 text-xs font-semibold text-center">{error}</Text>
            </View>
          ) : null}

          {/* TAB 1: PIN Verification */}
          {activeTab === 'pin' && (
            <View className="items-center">
              <Text className="text-sm font-semibold text-slate-600 mb-4">Enter 4-Digit Parent PIN</Text>

              {/* 4 Pin Dots */}
              <View className="flex-row space-x-4 mb-6">
                {[0, 1, 2, 3].map((idx) => {
                  const filled = enteredPin.length > idx;
                  return (
                    <View
                      key={idx}
                      className={`w-4 h-4 rounded-full mx-2 ${
                        filled ? 'bg-indigo-600' : 'bg-slate-200 border border-slate-300'
                      }`}
                    />
                  );
                })}
              </View>

              {/* Numpad */}
              <View className="w-full max-w-[260px] flex-row flex-wrap justify-between">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <TouchableOpacity
                    key={digit}
                    onPress={() => handleKeyPress(digit)}
                    className="w-[72px] h-[52px] bg-slate-50 border border-slate-200 rounded-2xl items-center justify-center mb-2.5 active:bg-indigo-50"
                  >
                    <Text className="text-xl font-black text-slate-800">{digit}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => {
                    setActiveTab('math');
                    setMathChallenge(parentalGateService.generateMathChallenge());
                  }}
                  className="w-[72px] h-[52px] rounded-2xl items-center justify-center mb-2.5"
                >
                  <Text className="text-xs font-bold text-indigo-600 text-center">Math Mode</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleKeyPress('0')}
                  className="w-[72px] h-[52px] bg-slate-50 border border-slate-200 rounded-2xl items-center justify-center mb-2.5 active:bg-indigo-50"
                >
                  <Text className="text-xl font-black text-slate-800">0</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDelete}
                  className="w-[72px] h-[52px] bg-slate-100 rounded-2xl items-center justify-center mb-2.5 active:bg-slate-200"
                >
                  <Text className="text-sm font-bold text-slate-600">⌫</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB 2: Adult Math Challenge */}
          {activeTab === 'math' && (
            <View className="items-center">
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 w-full mb-4 items-center">
                <Text className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                  Ask a Parent
                </Text>
                <Text className="text-2xl font-black text-slate-800 my-1">
                  {mathChallenge.question}
                </Text>
              </View>

              <TextInput
                value={mathInput}
                onChangeText={setMathInput}
                keyboardType="number-pad"
                placeholder="Enter answer"
                placeholderTextColor="#94a3b8"
                autoFocus
                className="w-full bg-slate-50 border-2 border-indigo-100 rounded-2xl py-3 px-4 text-center text-xl font-bold text-slate-800 mb-4"
              />

              <TouchableOpacity
                onPress={handleMathSubmit}
                className="w-full bg-indigo-600 py-3.5 rounded-2xl items-center mb-2"
              >
                <Text className="text-white font-black text-base">Verify Adult 🚀</Text>
              </TouchableOpacity>

              {hasPin && (
                <TouchableOpacity
                  onPress={() => setActiveTab('pin')}
                  className="py-2"
                >
                  <Text className="text-indigo-600 font-bold text-xs">Switch to PIN</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* TAB 3: Set or Change PIN */}
          {activeTab === 'set-pin' && (
            <View className="items-center">
              <Text className="text-sm font-bold text-slate-700 mb-1">
                {pinStep === 'create' ? 'Choose 4-Digit Parent PIN' : 'Re-Enter PIN to Confirm'}
              </Text>
              <Text className="text-xs text-slate-400 mb-4 text-center">
                This PIN keeps kid users from accessing parental settings and data.
              </Text>

              {/* 4 Pin Dots */}
              <View className="flex-row space-x-4 mb-6">
                {[0, 1, 2, 3].map((idx) => {
                  const filled = enteredPin.length > idx;
                  return (
                    <View
                      key={idx}
                      className={`w-4 h-4 rounded-full mx-2 ${
                        filled ? 'bg-indigo-600' : 'bg-slate-200 border border-slate-300'
                      }`}
                    />
                  );
                })}
              </View>

              {/* Numpad */}
              <View className="w-full max-w-[260px] flex-row flex-wrap justify-between">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <TouchableOpacity
                    key={digit}
                    onPress={() => {
                      if (pinStep === 'create') {
                        if (enteredPin.length < 3) {
                          setEnteredPin((prev) => prev + digit);
                        } else if (enteredPin.length === 3) {
                          const completePin = enteredPin + digit;
                          setConfirmPin(completePin);
                          setEnteredPin('');
                          setPinStep('confirm');
                        }
                      } else {
                        handleKeyPress(digit);
                      }
                    }}
                    className="w-[72px] h-[52px] bg-slate-50 border border-slate-200 rounded-2xl items-center justify-center mb-2.5 active:bg-indigo-50"
                  >
                    <Text className="text-xl font-black text-slate-800">{digit}</Text>
                  </TouchableOpacity>
                ))}
                <View className="w-[72px] h-[52px]" />
                <TouchableOpacity
                  onPress={() => {
                    if (pinStep === 'create') {
                      if (enteredPin.length < 3) {
                        setEnteredPin((prev) => prev + '0');
                      } else if (enteredPin.length === 3) {
                        const completePin = enteredPin + '0';
                        setConfirmPin(completePin);
                        setEnteredPin('');
                        setPinStep('confirm');
                      }
                    } else {
                      handleKeyPress('0');
                    }
                  }}
                  className="w-[72px] h-[52px] bg-slate-50 border border-slate-200 rounded-2xl items-center justify-center mb-2.5 active:bg-indigo-50"
                >
                  <Text className="text-xl font-black text-slate-800">0</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDelete}
                  className="w-[72px] h-[52px] bg-slate-100 rounded-2xl items-center justify-center mb-2.5 active:bg-slate-200"
                >
                  <Text className="text-sm font-bold text-slate-600">⌫</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Cancel button */}
          <TouchableOpacity
            onPress={onCancel}
            className="mt-3 py-2.5 items-center rounded-xl bg-slate-100 active:bg-slate-200"
          >
            <Text className="text-slate-600 font-bold text-sm">Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
