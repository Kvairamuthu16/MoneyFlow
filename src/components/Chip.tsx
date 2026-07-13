import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
}

export function Chip({ label, selected = false, onPress, tone = 'accent' }: ChipProps) {
  const theme = useTheme();
  const toneColor =
    tone === 'success' ? theme.colors.success : tone === 'warning' ? theme.colors.warning : tone === 'danger' ? theme.colors.danger : theme.colors.accent;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        minHeight: 36,
        paddingHorizontal: 14,
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: selected ? toneColor : theme.colors.border,
        backgroundColor: selected ? `${toneColor}22` : theme.colors.surface
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? toneColor : theme.colors.textSecondary }}>{label}</Text>
    </TouchableOpacity>
  );
}
