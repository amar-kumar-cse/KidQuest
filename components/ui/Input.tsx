import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  type TextInputProps,
} from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightAction?: { icon: string; onPress: () => void };
  hint?: string;
}

export function Input({
  label,
  error,
  leftIcon,
  rightAction,
  hint,
  secureTextEntry,
  className,
  style,
  ...rest
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = secureTextEntry;

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-semibold text-slate-600 mb-1.5 ml-1">
          {label}
        </Text>
      )}
      <View
        className={`flex-row items-center bg-white border rounded-xl px-4 py-3 ${
          error ? 'border-red-400' : 'border-slate-200'
        }`}
      >
        {leftIcon && (
          <Text className="text-lg mr-3">{leftIcon}</Text>
        )}
        <TextInput
          className="flex-1 text-slate-800 text-base"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={isPasswordField && !showPassword}
          style={style}
          {...rest}
        />
        {isPasswordField && (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            className="ml-2 p-1"
          >
            <Text className="text-slate-400 text-lg">
              {showPassword ? '🙈' : '👁️'}
            </Text>
          </TouchableOpacity>
        )}
        {rightAction && !isPasswordField && (
          <TouchableOpacity onPress={rightAction.onPress} className="ml-2 p-1">
            <Text className="text-lg">{rightAction.icon}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text>
      )}
      {hint && !error && (
        <Text className="text-slate-400 text-xs mt-1 ml-1">{hint}</Text>
      )}
    </View>
  );
}
