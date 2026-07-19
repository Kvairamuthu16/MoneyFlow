import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CartesianChart, Line, Pie, PolarChart } from 'victory-native';

// victory-native's PieChart returns a raw array (not a single JSX element),
// which is valid at runtime but rejected by TypeScript's stricter component
// typing. Cast locally rather than suppressing type-checking app-wide.
const PieChartComponent = Pie.Chart as unknown as React.ComponentType<{ children: () => React.ReactNode }>;
import { ShoppingBag, Landmark, TrendingUp, Lightbulb, Users, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { useAppData, useCurrency } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../../components/Card';
import { MonthSelector } from '../../components/MonthSelector';
import { formatYearMonth, getRecentMonths } from '../../utils/date';
import { computeAccountSummaries } from '../../utils/accountSummary';
import { computeMerchantSummaries } from '../../utils/merchantInsights';
import { computeContactSummaries, topPaidTo, topReceivedFrom } from '../../utils/contactInsights';

export default function AnalyticsScreen() {
  const theme = useTheme();
  const { format } = useCurrency();
  const { settings, setSelectedMonth, transactions, monthlyTransactions, budgets } = useAppData();

  // Only meaningful to show once there's more than one distinct bank/account.
  const accountSummaries = useMemo(() => computeAccountSummaries(transactions, settings.selectedMonth), [transactions, settings.selectedMonth]);
  const accountMonthTotal = useMemo(() => accountSummaries.reduce((s, a) => s + a.monthExpense, 0), [accountSummaries]);

  const categorySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    let totalExpenses = 0;

    monthlyTransactions.forEach((t) => {
      if (t.type === 'expense') {
        summary[t.category] = (summary[t.category] || 0) + t.amount;
        totalExpenses += t.amount;
      }
    });

    return Object.entries(summary)
      .map(([name, amount]) => ({ name, amount, percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthlyTransactions]);

  const pieData = useMemo(
    () =>
      categorySummary.map((c, idx) => ({
        value: c.amount,
        color: theme.chartPalette[idx % theme.chartPalette.length],
        label: c.name
      })),
    [categorySummary, theme.chartPalette]
  );

  const topMerchants = useMemo(() => computeMerchantSummaries(monthlyTransactions).slice(0, 5), [monthlyTransactions]);

  // Contact relationships compound over time, unlike month-scoped spend --
  // uses the full transaction history rather than just the selected month.
  const contactSummaries = useMemo(() => computeContactSummaries(transactions), [transactions]);
  const topPaid = useMemo(() => topPaidTo(contactSummaries, 4), [contactSummaries]);
  const topReceived = useMemo(() => topReceivedFrom(contactSummaries, 4), [contactSummaries]);

  // Trend of total monthly expense over the last 6 months, oldest first.
  const trendData = useMemo(() => {
    const months = getRecentMonths(6).reverse();
    return months.map((m) => {
      const total = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(m)).reduce((sum, t) => sum + t.amount, 0);
      return { month: formatYearMonth(m).split(' ')[0], total };
    });
  }, [transactions]);

  const recommendations = useMemo(() => {
    const tips: string[] = [];
    const totalExpense = categorySummary.reduce((s, c) => s + c.amount, 0);
    const totalIncome = monthlyTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    if (categorySummary.length > 0 && categorySummary[0].percentage >= 35) {
      tips.push(`${categorySummary[0].name} makes up ${categorySummary[0].percentage.toFixed(0)}% of your spend — consider a tighter budget here.`);
    }

    const prevMonths = getRecentMonths(2);
    const prevMonth = prevMonths[1];
    const prevExpense = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(prevMonth)).reduce((s, t) => s + t.amount, 0);
    if (prevExpense > 0 && totalExpense > prevExpense * 1.15) {
      const change = ((totalExpense - prevExpense) / prevExpense) * 100;
      tips.push(`Spending is up ${change.toFixed(0)}% compared to ${formatYearMonth(prevMonth)}.`);
    }

    if (categorySummary.length > 0) {
      const topCategoryHasBudget = budgets.some((b) => b.category === categorySummary[0].name);
      if (!topCategoryHasBudget) {
        tips.push(`You don't have a budget set for ${categorySummary[0].name}, your top spending category.`);
      }
    }

    if (totalIncome > 0 && (totalIncome - totalExpense) / totalIncome < 0.1) {
      tips.push('Your savings rate is below 10% this month — look for discretionary spend to trim.');
    }

    if (tips.length === 0) {
      tips.push("You're on track this month. Keep monitoring your top categories for any spikes.");
    }

    return tips;
  }, [categorySummary, monthlyTransactions, transactions, budgets]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Advanced Insights</Text>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' }}>Financial Analytics</Text>
          </View>
          <MonthSelector value={settings.selectedMonth} onChange={setSelectedMonth} />
        </View>

        {/* Top Spend Category card */}
        {categorySummary.length > 0 && (
          <Animated.View entering={FadeIn} style={{ marginHorizontal: 24, marginBottom: 20 }}>
            <Card style={{ backgroundColor: theme.colors.accentMuted, borderColor: `${theme.colors.accent}33` }}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>
                Dominant Spending Sector
              </Text>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800' }}>{categorySummary[0].name}</Text>
              <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                Consuming {categorySummary[0].percentage.toFixed(0)}% of total monthly expenses ({format(categorySummary[0].amount)})
              </Text>
            </Card>
          </Animated.View>
        )}

        {/* Category Share Pie Chart */}
        {pieData.length > 0 && (
          <Animated.View entering={FadeIn.delay(80)} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 12 }}>Category Share</Text>
            <Card>
              <View style={{ height: 200 }}>
                <PolarChart data={pieData} colorKey="color" valueKey="value" labelKey="label">
                  <PieChartComponent>{() => <Pie.Slice />}</PieChartComponent>
                </PolarChart>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                {categorySummary.slice(0, 6).map((c, idx) => (
                  <View key={c.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.chartPalette[idx % theme.chartPalette.length] }} />
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                      {c.name} ({c.percentage.toFixed(0)}%)
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </Animated.View>
        )}

        {/* 6-Month Trend Line Chart */}
        <Animated.View entering={FadeIn.delay(120)} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <TrendingUp size={16} color={theme.colors.accent} />
            <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' }}>6-Month Spend Trend</Text>
          </View>
          <Card>
            <View style={{ height: 160 }}>
              <CartesianChart data={trendData} xKey="month" yKeys={['total']}>
                {({ points }) => <Line points={points.total} color={theme.colors.accent} strokeWidth={3} curveType="natural" />}
              </CartesianChart>
            </View>
          </Card>
        </Animated.View>

        {/* Categories Analysis */}
        <Animated.View entering={FadeIn.delay(160)} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <ShoppingBag size={16} color={theme.colors.accent} />
            <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' }}>Category Breakdown</Text>
          </View>

          <Card style={{ gap: 14 }}>
            {categorySummary.map((item, idx) => (
              <View key={item.name} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>{item.name}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
                    {format(item.amount)} ({item.percentage.toFixed(0)}%)
                  </Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' }}>
                  <View style={{ width: `${item.percentage}%`, height: '100%', backgroundColor: theme.chartPalette[idx % theme.chartPalette.length] }} />
                </View>
              </View>
            ))}

            {categorySummary.length === 0 && (
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 24 }}>
                No expense records available to model
              </Text>
            )}
          </Card>
        </Animated.View>

        {/* Bank/Account Breakdown -- segregated spend, only worth showing with more than one account */}
        {accountSummaries.length > 1 && (
          <Animated.View entering={FadeIn.delay(180)} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Landmark size={16} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' }}>Spend By Bank/Account</Text>
            </View>

            <Card style={{ gap: 14 }}>
              {accountSummaries.map((account, idx) => {
                const pct = accountMonthTotal > 0 ? (account.monthExpense / accountMonthTotal) * 100 : 0;
                return (
                  <View key={account.label} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>{account.label}</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
                        {format(account.monthExpense)} ({pct.toFixed(0)}%)
                      </Text>
                    </View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: theme.chartPalette[idx % theme.chartPalette.length] }} />
                    </View>
                  </View>
                );
              })}
            </Card>
          </Animated.View>
        )}

        {/* Merchant Analysis */}
        <Animated.View entering={FadeIn.delay(200)} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Landmark size={16} color={theme.colors.success} />
            <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' }}>Highest Volume Merchants</Text>
          </View>

          <Card padded={false}>
            {topMerchants.map((merchant, idx) => (
              <View
                key={merchant.merchant}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 14,
                  borderBottomWidth: idx === topMerchants.length - 1 ? 0 : 1,
                  borderBottomColor: theme.colors.border
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '800' }}>0{idx + 1}</Text>
                  </View>
                  <View>
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>{merchant.merchant}</Text>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 9, fontWeight: '600', marginTop: 2 }}>
                      {merchant.visitCount} visits • avg {format(merchant.averageSpend)} • highest {format(merchant.highestBill)}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '800' }}>{format(merchant.totalSpend)}</Text>
              </View>
            ))}

            {topMerchants.length === 0 && (
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 32 }}>No transactions available to map</Text>
            )}
          </Card>
        </Animated.View>

        {/* Contact Intelligence -- person-to-person transactions only (merchant purchases excluded), all-time */}
        {(topPaid.length > 0 || topReceived.length > 0) && (
          <Animated.View entering={FadeIn.delay(220)} style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Users size={16} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' }}>People</Text>
            </View>

            <View style={{ gap: 12 }}>
              {topPaid.length > 0 && (
                <Card style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ArrowDownLeft size={13} color={theme.colors.danger} />
                    <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Top Paid To</Text>
                  </View>
                  {topPaid.map((contact) => (
                    <View key={contact.key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>{contact.label}</Text>
                      <Text style={{ color: theme.colors.danger, fontSize: 12, fontWeight: '700' }}>{format(contact.totalSent)}</Text>
                    </View>
                  ))}
                </Card>
              )}

              {topReceived.length > 0 && (
                <Card style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ArrowUpRight size={13} color={theme.colors.success} />
                    <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Top Received From</Text>
                  </View>
                  {topReceived.map((contact) => (
                    <View key={contact.key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>{contact.label}</Text>
                      <Text style={{ color: theme.colors.success, fontSize: 12, fontWeight: '700' }}>{format(contact.totalReceived)}</Text>
                    </View>
                  ))}
                </Card>
              )}
            </View>
          </Animated.View>
        )}

        {/* What to improve this month */}
        <Animated.View entering={FadeIn.delay(240)} style={{ paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Lightbulb size={16} color={theme.colors.warning} />
            <Text style={{ color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' }}>What To Improve This Month</Text>
          </View>
          <Card style={{ gap: 10 }}>
            {recommendations.map((tip, idx) => (
              <View key={idx} style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ color: theme.colors.warning, fontSize: 12, fontWeight: '800' }}>•</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, flex: 1, lineHeight: 17 }}>{tip}</Text>
              </View>
            ))}
          </Card>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
