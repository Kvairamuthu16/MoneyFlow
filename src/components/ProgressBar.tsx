import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ProgressBarProps {
  percent: number; // 0-100+ (values over 100 are clamped for the fill, but color logic can react to overflow via `tone`)
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  height?: number;
}

export function ProgressBar({ percent, tone = 'accent', height = 8 }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));

  const colorByTone: Record<NonNullable<ProgressBarProps['tone']>, string> = {
    accent: theme.colors.accent,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger
  };

  return (
    <View
      style={{
        height,
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.surfaceAlt,
        overflow: 'hidden'
      }}
    >
      <View
        style={{
          width: `${clamped}%`,
          height: '100%',
          borderRadius: theme.radius.full,
          backgroundColor: colorByTone[tone]
        }}
      />
    </View>
  );
}

export function budgetTone(percent: number): ProgressBarProps['tone'] {
  if (percent >= 100) return 'danger';
  if (percent >= 80) return 'warning';
  return 'success';
}
