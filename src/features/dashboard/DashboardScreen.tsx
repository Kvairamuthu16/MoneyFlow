import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {
  AlertTriangle,
  Sparkles,
  Wallet,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  MessageSquare,
  Flame,
  PiggyBank,
  ScanLine,
  PieChart
} from 'lucide-react-native';
import { useAppData, useCurrency } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../../components/Card';
import { KpiCard } from '../../components/KpiCard';
import { MonthSelector } from '../../components/MonthSelector';
import { useResponsive } from '../../hooks/useResponsive';
import { getDaysElapsed } from '../../utils/date';

export default function DashboardScreen({ navigation }: any) {
  const theme = useTheme();
  const { format } = useCurrency();
  const { kpiColumns } = useResponsive();
  const { settings, setSelectedMonth, monthlyTransactions, insights, isSyncing, syncSms } = useAppData();
  const [refreshing, setRefreshing] = useState(false);

  const { income, expense, remainingSafe, savingsRate, dailyBurn } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    monthlyTransactions.forEach((t) => {
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    });

    const safe = inc - exp;
    const rate = inc > 0 ? ((inc - exp) / inc) * 100 : 0;
    const daysElapsed = getDaysElapsed(settings.selectedMonth);
    const burn = daysElapsed > 0 ? exp / daysElapsed : 0;

    return { income: inc, expense: exp, remainingSafe: safe, savingsRate: Math.max(0, rate), dailyBurn: burn };
  }, [monthlyTransactions, settings.selectedMonth]);

  const runSmsSync = async (): Promise<void> => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'Automatic SMS reading is only available on Android.');
      return;
    }
    try {
      const { added, total } = await syncSms();
      Alert.alert(
        'Sync Complete',
        added > 0
          ? `Found ${added} new transaction${added === 1 ? '' : 's'} from your SMS inbox (${total} total).`
          : 'No new bank transactions found in your SMS inbox.'
      );
    } catch (error: any) {
      Alert.alert('Sync Failed', error?.message || 'Could not read SMS messages.');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    runSmsSync().finally(() => setRefreshing(false));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        {/* Header Title with Month Selector */}
        <Animated.View
          entering={SlideInUp.delay(100)}
          style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>MoneyFlow AI</Text>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>Active Financial Hub</Text>
          </View>
          <MonthSelector value={settings.selectedMonth} onChange={setSelectedMonth} />
        </Animated.View>

        {/* Hero Card */}
        <Animated.View entering={FadeIn.delay(200)} style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <LinearGradient
            colors={theme.gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 24, borderRadius: theme.radius.xl, overflow: 'hidden', ...theme.shadow.card }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  Durable Cash Balance
                </Text>
                <Text numberOfLines={1} style={{ color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 }}>
                  {format(remainingSafe, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <Wallet color="#fff" size={28} style={{ opacity: 0.9 }} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ArrowUpRight size={13} color="#6ee7b7" />
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Income</Text>
                </View>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 }}>{format(income)}</Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ArrowDownLeft size={13} color="#fda4af" />
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Expenses</Text>
                </View>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 }}>{format(expense)}</Text>
              </View>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Savings Rate</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 }}>{savingsRate.toFixed(0)}%</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* KPI Grid */}
        <Animated.View entering={FadeIn.delay(250)} style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flexBasis: kpiColumns === 4 ? '23%' : '47%', flexGrow: 1 }}>
              <KpiCard label="Income" value={format(income)} tone="success" icon={<ArrowUpRight size={14} color={theme.colors.success} />} />
            </View>
            <View style={{ flexBasis: kpiColumns === 4 ? '23%' : '47%', flexGrow: 1 }}>
              <KpiCard label="Expenses" value={format(expense)} tone="danger" icon={<ArrowDownLeft size={14} color={theme.colors.danger} />} />
            </View>
            <View style={{ flexBasis: kpiColumns === 4 ? '23%' : '47%', flexGrow: 1 }}>
              <KpiCard label="Savings Rate" value={`${savingsRate.toFixed(0)}%`} tone="accent" icon={<PiggyBank size={14} color={theme.colors.accent} />} />
            </View>
            <View style={{ flexBasis: kpiColumns === 4 ? '23%' : '47%', flexGrow: 1 }}>
              <KpiCard
                label="Daily Burn"
                value={format(dailyBurn)}
                tone="warning"
                icon={<Flame size={14} color={theme.colors.warning} />}
                hint="avg / day this month"
              />
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeIn.delay(300)} style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={runSmsSync}
              disabled={isSyncing}
              style={{ flex: 1, alignItems: 'center', gap: 6, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingVertical: 14 }}
            >
              <ScanLine size={18} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' }}>Scan SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Budgets')}
              style={{ flex: 1, alignItems: 'center', gap: 6, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingVertical: 14 }}
            >
              <PiggyBank size={18} color={theme.colors.success} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' }}>Add Budget</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Analytics')}
              style={{ flex: 1, alignItems: 'center', gap: 6, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingVertical: 14 }}
            >
              <PieChart size={18} color={theme.colors.warning} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' }}>Reports</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Offline SMART INSIGHTS section */}
        <Animated.View entering={FadeIn.delay(350)} style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' }}>Smart Offline Insights</Text>
            </View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '500' }}>Local AI Engine</Text>
          </View>

          <View style={{ gap: 10 }}>
            {insights.length === 0 && (
              <Card>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, textAlign: 'center' }}>
                  You have {format(remainingSafe)} remaining to spend safely this month.
                </Text>
              </Card>
            )}
            {insights.map((insight) => (
              <Card
                key={insight.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                  backgroundColor:
                    insight.type === 'danger' ? `${theme.colors.danger}1A` : insight.type === 'warning' ? `${theme.colors.warning}1A` : theme.colors.surface,
                  borderColor: insight.type === 'danger' ? `${theme.colors.danger}33` : insight.type === 'warning' ? `${theme.colors.warning}33` : theme.colors.border
                }}
              >
                <View
                  style={{
                    padding: 6,
                    borderRadius: theme.radius.sm,
                    backgroundColor: insight.type === 'danger' ? `${theme.colors.danger}33` : insight.type === 'warning' ? `${theme.colors.warning}33` : theme.colors.accentMuted
                  }}
                >
                  <AlertTriangle size={16} color={insight.type === 'danger' ? theme.colors.danger : insight.type === 'warning' ? theme.colors.warning : theme.colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>{insight.title}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 17 }}>{insight.description}</Text>
                </View>
                <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '600' }}>{insight.timestamp}</Text>
              </Card>
            ))}
          </View>
        </Animated.View>

        {/* Recent Transactions List with quick redirection */}
        <Animated.View entering={FadeIn.delay(400)} style={{ paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' }}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: '700' }}>See All</Text>
              <ChevronRight size={16} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>

          <Card padded={false}>
            {monthlyTransactions.slice(0, 4).map((tx, idx) => (
              <View
                key={tx.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 14,
                  borderBottomWidth: idx === Math.min(monthlyTransactions.length, 4) - 1 ? 0 : 1,
                  borderBottomColor: theme.colors.border
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
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
                    {tx.type === 'income' ? (
                      <ArrowUpRight size={18} color={theme.colors.success} />
                    ) : (
                      <ArrowDownLeft size={18} color={theme.colors.danger} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700', maxWidth: 150 }}>
                      {tx.merchant}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 }}>
                      {tx.category} • {tx.bank}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: tx.type === 'income' ? theme.colors.success : theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>
                    {tx.type === 'income' ? '+' : '-'}
                    {format(tx.amount)}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 }}>{tx.date}</Text>
                </View>
              </View>
            ))}

            {monthlyTransactions.length === 0 && (
              <TouchableOpacity onPress={runSmsSync} style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={28} color={theme.colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' }}>No SMS Transactions for this month</Text>
                <Text style={{ color: theme.colors.accent, fontSize: 10, marginTop: 4, fontWeight: '700' }}>Tap to scan your SMS inbox</Text>
              </TouchableOpacity>
            )}
          </Card>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
