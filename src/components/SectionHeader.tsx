import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ title, icon, actionLabel, onActionPress }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 }}>{title}</Text>
      </View>
      {actionLabel && onActionPress && (
        <TouchableOpacity onPress={onActionPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: '700' }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
