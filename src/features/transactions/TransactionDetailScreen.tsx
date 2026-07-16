import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trash2, ArrowUpRight, ArrowDownLeft, Tag, User, Landmark, Hash, MessageSquare } from 'lucide-react-native';
import { useAppData, useCurrency } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { ALL_CATEGORIES, LearningService, PartyLabelService } from '../../services/sms';
import { getAccountLabel } from '../../services/accountLabel';
import { TransactionStatus } from '../../types';

const STATUS_META: Record<TransactionStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  success: { label: 'Success', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  reversed: { label: 'Reversed', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' }
};

function confidenceTone(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 0.85) return 'success';
  if (score >= 0.6) return 'warning';
  return 'danger';
}

function Field({ label, value }: { label: string; value?: string }) {
  const theme = useTheme();
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 11, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

export default function TransactionDetailScreen({ navigation, route }: any) {
  const theme = useTheme();
  const { format } = useCurrency();
  const { transactions, updateTransaction, deleteTransaction } = useAppData();
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const tx = useMemo(() => transactions.find((t) => t.id === route?.params?.transactionId), [transactions, route?.params?.transactionId]);

  const partyId = tx?.mobileNumber || tx?.emailAddress || tx?.upiId;
  const [labelDraft, setLabelDraft] = useState(tx?.contactName || '');

  if (!tx) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>This transaction no longer exists.</Text>
        <Button label="Go Back" variant="secondary" style={{ marginTop: 16 }} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const statusMeta = STATUS_META[tx.status];

  const handleSelectCategory = (category: string) => {
    updateTransaction(tx.id, { category });
    // Remember this merchant -> category correction so future SMS from the
    // same merchant are auto-categorized this way (see LearningService).
    LearningService.recordCorrection(tx.merchant, category);
    setShowCategoryPicker(false);
  };

  const handleSaveLabel = () => {
    if (!partyId) return;
    const trimmed = labelDraft.trim();
    PartyLabelService.setLabel(partyId, trimmed);
    updateTransaction(tx.id, { contactName: trimmed || undefined });
  };

  const handleDelete = () => {
    Alert.alert('Delete Transaction', 'This will remove this transaction from your records. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTransaction(tx.id);
          navigation.goBack();
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={20} color={theme.colors.textPrimary} />
          <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' }}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete}>
          <Trash2 size={18} color={theme.colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60, gap: 16 }}>
        {/* Hero */}
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800' }}>{tx.contactName || tx.merchant}</Text>
              {tx.contactName && tx.contactName !== tx.merchant && (
                <Text style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }}>Parsed as "{tx.merchant}"</Text>
              )}
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: theme.radius.full,
                backgroundColor: `${theme.colors[statusMeta.tone]}22`
              }}
            >
              <Text style={{ color: theme.colors[statusMeta.tone], fontSize: 10, fontWeight: '700' }}>{statusMeta.label}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {tx.type === 'income' ? <ArrowUpRight size={18} color={theme.colors.success} /> : <ArrowDownLeft size={18} color={theme.colors.danger} />}
            <Text style={{ color: tx.type === 'income' ? theme.colors.success : theme.colors.textPrimary, fontSize: 26, fontWeight: '800' }}>
              {tx.type === 'income' ? '+' : '-'}
              {format(tx.amount)}
            </Text>
          </View>

          <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' }}>
            {tx.date} {tx.time ? `at ${tx.time}` : ''}
          </Text>
        </Card>

        {/* Category */}
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Tag size={14} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>{tx.category}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowCategoryPicker((v) => !v)}>
              <Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: '700' }}>{showCategoryPicker ? 'Cancel' : 'Change'}</Text>
            </TouchableOpacity>
          </View>
          {showCategoryPicker && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ALL_CATEGORIES.map((c) => (
                <Chip key={c} label={c} selected={c === tx.category} onPress={() => handleSelectCategory(c)} />
              ))}
            </View>
          )}
        </Card>

        {/* Counterparty */}
        {partyId && (
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <User size={14} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Counterparty</Text>
            </View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>{partyId}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={labelDraft}
                onChangeText={setLabelDraft}
                placeholder="Give this a name (e.g. Landlord)"
                placeholderTextColor={theme.colors.textMuted}
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.textPrimary,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 12
                }}
              />
              <Button label="Save" variant="secondary" onPress={handleSaveLabel} />
            </View>
          </Card>
        )}

        {/* Account & Payment */}
        <Card padded={false}>
          <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Landmark size={14} color={theme.colors.accent} />
            <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Account & Payment</Text>
          </View>
          <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
            <Field label="Bank / Account" value={getAccountLabel(tx.bank, tx.accountLast4)} />
            {tx.cardLast4 && <Field label="Card" value={`••${tx.cardLast4}`} />}
            <Field label="Payment Method" value={tx.paymentMethod} />
            <Field label="Currency" value={tx.currency} />
          </View>
        </Card>

        {/* Reference */}
        {(tx.referenceNumber || tx.utrNumber || tx.sourceSMSId) && (
          <Card padded={false}>
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Hash size={14} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Reference</Text>
            </View>
            <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
              <Field label="Reference No." value={tx.referenceNumber} />
              <Field label="UTR" value={tx.utrNumber} />
              <Field label="Balance After" value={tx.balanceAfter !== undefined ? format(tx.balanceAfter) : undefined} />
            </View>
          </Card>
        )}

        {/* Parser confidence */}
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Parser Confidence</Text>
            <Text style={{ color: theme.colors[confidenceTone(tx.confidenceScore)], fontSize: 12, fontWeight: '700' }}>
              {Math.round(tx.confidenceScore * 100)}%
            </Text>
          </View>
          <ProgressBar percent={tx.confidenceScore * 100} tone={confidenceTone(tx.confidenceScore)} />
          {tx.confidenceScore < 0.6 && (
            <Text style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }}>
              This one was hard to parse -- double-check the merchant and category above.
            </Text>
          )}
        </Card>

        {/* Source SMS (only present if the user opted in to storing raw SMS text) */}
        {tx.sourceText && (
          <Card style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={14} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Source SMS</Text>
            </View>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, lineHeight: 16 }}>{tx.sourceText}</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
