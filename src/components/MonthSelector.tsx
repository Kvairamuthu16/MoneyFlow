import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { formatYearMonth, getRecentMonths } from '../utils/date';

interface MonthSelectorProps {
  value: string;
  onChange: (month: string) => void;
  monthsBack?: number;
}

export function MonthSelector({ value, onChange, monthsBack = 12 }: MonthSelectorProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const months = getRecentMonths(monthsBack);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border
        }}
      >
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{formatYearMonth(value)}</Text>
        <ChevronDown size={14} color={theme.colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              paddingVertical: 12,
              maxHeight: '60%'
            }}
          >
            <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, marginBottom: 8 }} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 8 }}>
              Select Month
            </Text>
            {months.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => {
                  onChange(m);
                  setOpen(false);
                }}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: m === value ? theme.colors.accent : theme.colors.textPrimary, fontWeight: m === value ? '800' : '500', fontSize: 14 }}>
                  {formatYearMonth(m)}
                </Text>
                {m === value && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent }} />}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
