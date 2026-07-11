import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BarChart, PieChart, TrendingUp, Compass, ShoppingBag, Landmark } from 'lucide-react-native';
import { AppStorage } from '../../storage/mmkv';

export default function AnalyticsScreen() {
  const settings = useMemo(() => AppStorage.getSettings(), []);
  const transactions = useMemo(() => AppStorage.getTransactions(), []);

  const currencySymbol = settings.currency === 'INR' ? '₹' : settings.currency === 'USD' ? '$' : '€';

  // Compute category spending details
  const categorySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    let totalExpenses = 0;

    transactions.forEach(t => {
      if (t.type === 'expense' && t.date.startsWith(settings.selectedMonth)) {
        summary[t.category] = (summary[t.category] || 0) + t.amount;
        totalExpenses += t.amount;
      }
    });

    return Object.entries(summary)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, settings.selectedMonth]);

  // Compute top merchants
  const topMerchants = useMemo(() => {
    const merchants: Record<string, { amount: number; count: number }> = {};
    transactions.forEach(t => {
      if (t.type === 'expense' && t.date.startsWith(settings.selectedMonth)) {
        if (!merchants[t.merchant]) {
          merchants[t.merchant] = { amount: 0, count: 0 };
        }
        merchants[t.merchant].amount += t.amount;
        merchants[t.merchant].count += 1;
      }
    });

    return Object.entries(merchants)
      .map(([name, info]) => ({
        name,
        amount: info.amount,
        count: info.count
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions, settings.selectedMonth]);

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header Title */}
        <View className="px-6 py-4">
          <Text className="text-zinc-500 text-xs font-semibold tracking-wider uppercase">Advanced Insights</Text>
          <Text className="text-white text-xl font-black">Financial Analytics</Text>
        </View>

        {/* Top Spend Category card */}
        {categorySummary.length > 0 && (
          <Animated.View entering={FadeIn} className="mx-6 mb-6">
            <View className="bg-gradient-to-tr from-indigo-950/40 to-indigo-900/10 p-5 rounded-3xl border border-indigo-500/20">
              <Text className="text-zinc-400 text-xs font-bold uppercase mb-1">Dominant Spending Sector</Text>
              <Text className="text-white text-2xl font-black">{categorySummary[0].name}</Text>
              <Text className="text-indigo-400 text-xs font-semibold mt-1">
                Consuming {categorySummary[0].percentage.toFixed(0)}% of total monthly expenses ({currencySymbol}{categorySummary[0].amount.toLocaleString()})
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Categories Analysis */}
        <Animated.View entering={FadeIn.delay(100)} className="px-6 mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center space-x-1.5">
              <ShoppingBag className="w-4 h-4 text-indigo-400" />
              <Text className="text-white text-base font-bold tracking-tight">Category Breakdown</Text>
            </View>
          </View>

          <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            {categorySummary.map((item) => (
              <View key={item.name} className="space-y-1.5">
                <View className="flex-row justify-between text-xs">
                  <Text className="text-white font-bold">{item.name}</Text>
                  <Text className="text-zinc-400 font-bold">
                    {currencySymbol}{item.amount.toLocaleString()} ({item.percentage.toFixed(0)}%)
                  </Text>
                </View>
                <View className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                  <View 
                    style={{ width: `${item.percentage}%` }}
                    className="h-full bg-indigo-500 rounded-full"
                  />
                </View>
              </View>
            ))}

            {categorySummary.length === 0 && (
              <Text className="text-zinc-500 text-xs text-center py-6 font-semibold">No expense records available to model</Text>
            )}
          </View>
        </Animated.View>

        {/* Merchant Analysis */}
        <Animated.View entering={FadeIn.delay(200)} className="px-6">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center space-x-1.5">
              <Landmark className="w-4 h-4 text-emerald-400" />
              <Text className="text-white text-base font-bold tracking-tight">Highest Volume Merchants</Text>
            </View>
          </View>

          <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-2.5">
            {topMerchants.map((merchant, idx) => (
              <View key={merchant.name} className="flex-row justify-between items-center p-3.5 border-b border-zinc-800/30 last:border-0">
                <View className="flex-row items-center space-x-3">
                  <View className="w-7 h-7 rounded-full bg-zinc-800 items-center justify-center">
                    <Text className="text-zinc-400 text-[10px] font-black">0{idx + 1}</Text>
                  </View>
                  <View>
                    <Text className="text-white text-xs font-bold">{merchant.name}</Text>
                    <Text className="text-zinc-500 text-[9px] font-semibold mt-0.5">{merchant.count} Transactions</Text>
                  </View>
                </View>

                <Text className="text-white text-xs font-black">
                  {currencySymbol}{merchant.amount.toLocaleString()}
                </Text>
              </View>
            ))}

            {topMerchants.length === 0 && (
              <Text className="text-zinc-500 text-xs text-center py-8 font-semibold">No transactions available to map</Text>
            )}
          </View>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}
