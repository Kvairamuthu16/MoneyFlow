import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Edit3,
  ArrowUpDown,
  X
} from 'lucide-react-native';
import { useAppData, useCurrency } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { Chip } from '../../components/Chip';
import { ALL_CATEGORIES, LearningService } from '../../services/sms';
import { getAccountLabel } from '../../services/accountLabel';
import { Transaction } from '../../types';

const RECATEGORIZE_OPTIONS: string[] = [...ALL_CATEGORIES];

type ListRow = { kind: 'header'; label: string } | { kind: 'tx'; tx: Transaction };

function dateGroupLabel(dateStr: string): string {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function TransactionsScreen({ route }: any) {
  const theme = useTheme();
  const { format } = useCurrency();
  const { transactions, deleteTransaction, updateTransaction } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAccount, setSelectedAccount] = useState(route?.params?.accountFilter || 'All');

  // Coming from Dashboard's "jump to this account" tap re-applies the filter
  // even if this tab was already mounted (tab navigators don't remount on
  // re-navigation, so a state initializer alone wouldn't catch that case).
  useEffect(() => {
    if (route?.params?.accountFilter) {
      setSelectedAccount(route.params.accountFilter);
      setShowFilters(true);
    }
  }, [route?.params?.accountFilter]);

  const categories = useMemo(() => {
    const list = new Set(transactions.map((t) => t.category));
    return ['All', ...Array.from(list)];
  }, [transactions]);

  // Accounts are derived automatically from parsed SMS (bank + masked last
  // digits) -- there's no separate manually-managed "accounts" entity yet.
  const accounts = useMemo(() => {
    const list = new Set(transactions.map((t) => getAccountLabel(t.bank, t.accountLast4)));
    return ['All', ...Array.from(list)];
  }, [transactions]);

  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.merchant.toLowerCase().includes(q) ||
          t.bank.toLowerCase().includes(q) ||
          (t.accountLast4 && t.accountLast4.includes(q)) ||
          (t.sourceText && t.sourceText.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (selectedCategory !== 'All') {
      result = result.filter((t) => t.category === selectedCategory);
    }

    if (selectedAccount !== 'All') {
      result = result.filter((t) => getAccountLabel(t.bank, t.accountLast4) === selectedAccount);
    }

    result.sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '00:00'}:00`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00'}:00`).getTime();
      if (sortBy === 'newest') return timeB - timeA;
      if (sortBy === 'oldest') return timeA - timeB;
      if (sortBy === 'highest') return b.amount - a.amount;
      if (sortBy === 'lowest') return a.amount - b.amount;
      return 0;
    });

    return result;
  }, [transactions, searchQuery, typeFilter, selectedCategory, selectedAccount, sortBy]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    processedTransactions.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense };
  }, [processedTransactions]);

  const rows = useMemo<ListRow[]>(() => {
    if (sortBy !== 'newest' && sortBy !== 'oldest') {
      // Grouping by date only makes sense for chronological sorts.
      return processedTransactions.map((tx) => ({ kind: 'tx', tx }));
    }
    const out: ListRow[] = [];
    let lastLabel: string | null = null;
    for (const tx of processedTransactions) {
      const label = dateGroupLabel(tx.date);
      if (label !== lastLabel) {
        out.push({ kind: 'header', label });
        lastLabel = label;
      }
      out.push({ kind: 'tx', tx });
    }
    return out;
  }, [processedTransactions, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' || typeFilter !== 'all' || selectedCategory !== 'All' || selectedAccount !== 'All' || sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setSelectedCategory('All');
    setSelectedAccount('All');
    setSortBy('newest');
  };

  const handleCategoryChange = (id: string, currentCategory: string, merchant: string) => {
    const curIdx = RECATEGORIZE_OPTIONS.indexOf(currentCategory);
    const nextCat = RECATEGORIZE_OPTIONS[(curIdx + 1) % RECATEGORIZE_OPTIONS.length];
    updateTransaction(id, { category: nextCat });
    // Remember this merchant -> category correction so future SMS from the
    // same merchant are auto-categorized this way (see LearningService).
    LearningService.recordCorrection(merchant, nextCat);
  };

  const renderRightActions = (
    _progress: RNAnimated.AnimatedInterpolation<number>,
    _drag: RNAnimated.AnimatedInterpolation<number>,
    swipeable: Swipeable,
    tx: Transaction
  ) => {
    return (
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        <TouchableOpacity
          onPress={() => {
            handleCategoryChange(tx.id, tx.category, tx.merchant);
            swipeable.close();
          }}
          style={{ width: 64, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' }}
        >
          <Edit3 size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 4 }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => deleteTransaction(tx.id)}
          style={{ width: 64, backgroundColor: theme.colors.danger, alignItems: 'center', justifyContent: 'center', borderTopRightRadius: 16, borderBottomRightRadius: 16 }}
        >
          <Trash2 size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 4 }}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRow = ({ item }: { item: ListRow }) => {
    if (item.kind === 'header') {
      return (
        <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginHorizontal: 24, marginTop: 12, marginBottom: 6 }}>
          {item.label}
        </Text>
      );
    }

    const tx = item.tx;
    return (
      <Animated.View entering={FadeIn} style={{ marginHorizontal: 24, marginBottom: 10 }}>
        <Swipeable renderRightActions={(p, d, s) => renderRightActions(p, d, s as unknown as Swipeable, tx)} overshootRight={false}>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: 14,
              borderRadius: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 10 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tx.type === 'income' ? `${theme.colors.success}1A` : `${theme.colors.danger}1A`
                }}
              >
                {tx.type === 'income' ? <ArrowUpRight size={18} color={theme.colors.success} /> : <ArrowDownLeft size={18} color={theme.colors.danger} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' }}>
                  {tx.contactName || tx.merchant}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 }}>
                  {tx.category} • {getAccountLabel(tx.bank, tx.accountLast4)} • {tx.paymentMethod}
                </Text>
                {tx.sourceText && (
                  <Text numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: 9, marginTop: 3, opacity: 0.8 }}>
                    "{tx.sourceText}"
                  </Text>
                )}
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: tx.type === 'income' ? theme.colors.success : theme.colors.textPrimary }}>
                {tx.type === 'income' ? '+' : '-'}
                {format(tx.amount)}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 }}>{tx.date}</Text>
            </View>
          </View>
        </Swipeable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Sticky Search Header */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 12 }}>SMS Ledger</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 10
            }}
          >
            <Search size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search merchants, banks, ref numbers..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ color: theme.colors.textPrimary, fontSize: 12, flex: 1, padding: 0 }}
            />
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={{
              padding: 12,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: showFilters ? theme.colors.accent : theme.colors.border,
              borderRadius: 16
            }}
          >
            <SlidersHorizontal size={16} color={showFilters ? theme.colors.accent : theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Summary row for the currently filtered set */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>
            {processedTransactions.length} transaction{processedTransactions.length === 1 ? '' : 's'}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '700' }}>
            <Text style={{ color: theme.colors.success }}>+{format(summary.income)}</Text>
            {'  '}
            <Text style={{ color: theme.colors.danger }}>-{format(summary.expense)}</Text>
          </Text>
        </View>
      </View>

      {/* Advanced Filter Pane */}
      {showFilters && (
        <Animated.View entering={FadeIn} style={{ backgroundColor: theme.colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 16, paddingHorizontal: 24, gap: 14 }}>
          <View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>Transaction Type</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['all', 'income', 'expense'] as const).map((type) => (
                <Chip key={type} label={type} selected={typeFilter === type} onPress={() => setTypeFilter(type)} />
              ))}
            </View>
          </View>

          <View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>Sort Order</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['newest', 'oldest', 'highest', 'lowest'] as const).map((sort) => (
                <Chip key={sort} label={sort} selected={sortBy === sort} onPress={() => setSortBy(sort)} />
              ))}
            </View>
          </View>

          {accounts.length > 2 && (
            <View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>Account</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {accounts.map((acc) => (
                  <Chip key={acc} label={acc} selected={selectedAccount === acc} onPress={() => setSelectedAccount(acc)} />
                ))}
              </View>
            </View>
          )}

          {hasActiveFilters && (
            <TouchableOpacity onPress={resetFilters} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
              <X size={14} color={theme.colors.danger} />
              <Text style={{ color: theme.colors.danger, fontSize: 12, fontWeight: '700' }}>Reset Filters</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Categories Horizontal scroll */}
      <View style={{ paddingVertical: 12 }}>
        <FlashList
          horizontal
          estimatedItemSize={80}
          data={categories}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          renderItem={({ item }) => (
            <View style={{ marginRight: 8 }}>
              <Chip label={item} selected={selectedCategory === item} onPress={() => setSelectedCategory(item)} />
            </View>
          )}
        />
      </View>

      {/* Main FlashList - grouped by date, high efficiency rendering */}
      <View style={{ flex: 1 }}>
        <FlashList
          data={rows}
          renderItem={renderRow}
          estimatedItemSize={110}
          getItemType={(item) => item.kind}
          ListEmptyComponent={
            <View style={{ paddingVertical: 96, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' }}>No transactions match your filters</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>Try resetting the search query or sorting</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
