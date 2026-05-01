import React from 'react';
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'bordered' | 'dark';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  variant = 'default',
  padding = 'md',
  children,
  className,
  style,
  ...rest
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const variantStyles = {
    default: 'bg-white rounded-2xl shadow-sm border border-slate-100',
    elevated: 'bg-white rounded-2xl shadow-md',
    bordered: 'bg-white rounded-2xl border-2 border-indigo-100',
    dark: 'bg-slate-800 rounded-2xl',
  };

  return (
    <View
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${className ?? ''}`}
      style={style}
      {...rest}
    >
      {children}
    </View>
  );
}
