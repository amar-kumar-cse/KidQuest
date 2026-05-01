import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'kid';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: string;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const sizeStyles = {
    sm: 'px-4 py-2 rounded-xl',
    md: 'px-6 py-3.5 rounded-2xl',
    lg: 'px-8 py-4 rounded-2xl',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const variantStyles = {
    primary: 'bg-indigo-600 active:bg-indigo-700',
    secondary: 'bg-slate-100 border border-slate-200 active:bg-slate-200',
    danger: 'bg-red-500 active:bg-red-600',
    ghost: 'bg-transparent border border-indigo-300 active:bg-indigo-50',
    kid: 'bg-yellow-400 border-b-4 border-yellow-500 active:bg-yellow-500',
  };

  const textVariantStyles = {
    primary: 'text-white font-bold',
    secondary: 'text-slate-700 font-semibold',
    danger: 'text-white font-bold',
    ghost: 'text-indigo-600 font-semibold',
    kid: 'text-yellow-900 font-black',
  };

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center ${sizeStyles[size]} ${variantStyles[variant]} ${disabled || isLoading ? 'opacity-60' : ''}`}
      disabled={disabled || isLoading}
      style={style}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? '#6366f1' : '#fff'}
        />
      ) : (
        <>
          {leftIcon && (
            <Text className={`mr-2 ${textSizeStyles[size]}`}>{leftIcon}</Text>
          )}
          <Text className={`${textSizeStyles[size]} ${textVariantStyles[variant]}`}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
