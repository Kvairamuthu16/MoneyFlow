import React from 'react';
import { View, Text } from 'react-native';
import { Card } from './Card';
import { useTheme } from '../context/ThemeContext';

interface KpiCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
  hint?: string;
}

export function KpiCard({ label, value, icon, tone = 'neutral', hint }: KpiCardProps) {
  const theme = useTheme();
  const toneColor =
    tone === 'success'
      ? theme.colors.success
      : tone === 'warning'
      ? theme.colors.warning
      : tone === 'danger'
      ? theme.colors.danger
      : tone === 'accent'
      ? theme.colors.accent
      : theme.colors.textPrimary;

  return (
    <Card style={{ flex: 1, minWidth: 140 }} padded>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>
          {label}
        </Text>
        {icon}
      </View>
      <Text numberOfLines={1} style={{ color: toneColor, fontSize: 18, fontWeight: '800', marginTop: 8 }}>
        {value}
      </Text>
      {hint ? <Text style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }}>{hint}</Text> : null}
    </Card>
  );
}
