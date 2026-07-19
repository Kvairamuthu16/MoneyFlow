import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Send, Sparkles } from 'lucide-react-native';
import { useAppData } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { answerQuery } from '../../utils/queryAssistant';

const SUGGESTED_PROMPTS = ['How much did I spend on food?', 'Show my subscriptions', 'Who paid me the most?', 'Compare this month with last month', 'Show failed transactions'];

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export function AiAssistantModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const { transactions, settings } = useAppData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const ask = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const { answer } = answerQuery(trimmed, transactions, settings.currency, settings.selectedMonth);
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }, { role: 'assistant', text: answer }]);
    setInput('');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color={theme.colors.accent} />
            <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' }}>Ask MoneyFlow AI</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, gap: 12, flexGrow: 1 }}>
          {messages.length === 0 && (
            <View style={{ gap: 10 }}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                Ask about your spending, contacts, or subscriptions -- answers come only from what's already on this device.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    onPress={() => ask(prompt)}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.full, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}
                  >
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((message, idx) => (
            <View
              key={idx}
              style={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                backgroundColor: message.role === 'user' ? theme.colors.accent : theme.colors.surface,
                borderWidth: message.role === 'user' ? 0 : 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                paddingHorizontal: 14,
                paddingVertical: 10
              }}
            >
              <Text style={{ color: message.role === 'user' ? theme.colors.onAccent : theme.colors.textPrimary, fontSize: 12, lineHeight: 18 }}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => ask(input)}
            placeholder="Ask a question about your money..."
            placeholderTextColor={theme.colors.textMuted}
            style={{
              flex: 1,
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.full,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 13
            }}
          />
          <TouchableOpacity
            onPress={() => ask(input)}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <Send size={16} color={theme.colors.onAccent} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
