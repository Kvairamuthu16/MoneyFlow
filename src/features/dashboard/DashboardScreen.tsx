import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Sparkles, 
  Wallet, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MessageSquare
} from 'lucide-react-native';
import { AppStorage } from '../../storage/mmkv';
import { Transaction, Budget, SmartInsight } from '../../types';

export default function DashboardScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const settings = useMemo(() => AppStorage.getSettings(), []);
  const transactions = useMemo(() => AppStorage.getTransactions(), [refreshing]);
  const budgets = useMemo(() => AppStorage.getBudgets(), [refreshing]);

  const currencySymbol = settings.currency === 'INR' ? '₹' : settings.currency === 'USD' ? '$' : '€';

  // Filter transaction by selected month (e.g. "2026-07")
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(settings.selectedMonth));
  }, [transactions, settings.selectedMonth]);

  // Compute metrics
  const { income, expense, remainingSafe, savingsRate } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    monthlyTransactions.forEach(t => {
      if (t.type === 'income') {
        inc += t.amount;
      } else {
        exp += t.amount;
      }
    });

    const safe = inc - exp;
    const rate = inc > 0 ? ((inc - exp) / inc) * 100 : 0;

    return {
      income: inc,
      expense: exp,
      remainingSafe: safe,
      savingsRate: Math.max(0, rate)
    };
  }, [monthlyTransactions]);

  const insights: SmartInsight[] = useMemo(() => {
    const list: SmartInsight[] = [];
    if (expense > income && income > 0) {
      list.push({
        id: '1',
        title: 'Budget Alert',
        description: 'Your monthly expenses have exceeded your total income.',
        type: 'danger',
        timestamp: 'Just now'
      });
    }
    
    // Find Swiggy spend
    const foodSpend = monthlyTransactions
      .filter(t => t.category === 'Food')
      .reduce((sum, t) => sum + t.amount, 0);

    if (foodSpend > (expense * 0.25) && expense > 0) {
      list.push({
        id: '2',
        title: 'High Food Spend',
        description: `Food consumption represents ${((foodSpend / expense) * 100).toFixed(0)}% of your total budget.`,
        type: 'warning',
        timestamp: 'Today'
      });
    }

    list.push({
      id: '3',
      title: 'Safe Spend Capital',
      description: `You have ${currencySymbol}${remainingSafe.toLocaleString()} remaining to spend safely this month.`,
      type: 'success',
      timestamp: 'Active'
    });

    return list;
  }, [monthlyTransactions, income, expense, remainingSafe, currencySymbol]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {/* Header Title with Month Selector */}
        <Animated.View entering={SlideInUp.delay(100)} className="px-6 py-4 flex-row justify-between items-center">
          <View>
            <Text className="text-zinc-500 text-xs font-semibold tracking-wider uppercase">MoneyFlow AI</Text>
            <Text className="text-white text-2xl font-extrabold tracking-tight">Active Financial Hub</Text>
          </View>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Settings')}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full flex-row items-center space-x-1.5"
          >
            <Text className="text-zinc-300 text-xs font-bold uppercase">July 2026</Text>
            <Text className="text-zinc-500 text-[10px]">▼</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Hero Card: Credit / Apple Wallet style */}
        <Animated.View entering={FadeIn.delay(200)} className="px-6 mb-6">
          <View className="bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 p-6 rounded-3xl shadow-xl border border-indigo-400/20 relative overflow-hidden">
            {/* Glossy backdrop circles */}
            <View className="absolute right-[-20%] top-[-20%] w-48 h-48 bg-white/10 rounded-full" />
            <View className="absolute left-[-10%] bottom-[-30%] w-36 h-36 bg-black/10 rounded-full" />

            <View className="flex-row justify-between items-start z-10">
              <View>
                <Text className="text-indigo-100 text-xs font-bold tracking-widest uppercase mb-1">Durable Cash Balance</Text>
                <Text className="text-white text-4xl font-extrabold tracking-tight">
                  {currencySymbol}{remainingSafe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <Wallet className="text-white w-8 h-8 opacity-90" />
            </View>

            <View className="mt-8 grid grid-cols-2 flex-row justify-between border-t border-indigo-400/30 pt-4 z-10">
              <View>
                <View className="flex-row items-center space-x-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300" />
                  <Text className="text-indigo-100 text-[10px] uppercase font-bold tracking-wider">Income</Text>
                </View>
                <Text className="text-white text-base font-extrabold mt-0.5">
                  {currencySymbol}{income.toLocaleString()}
                </Text>
              </View>

              <View>
                <View className="flex-row items-center space-x-1">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-rose-300" />
                  <Text className="text-indigo-100 text-[10px] uppercase font-bold tracking-wider">Expenses</Text>
                </View>
                <Text className="text-white text-base font-extrabold mt-0.5">
                  {currencySymbol}{expense.toLocaleString()}
                </Text>
              </View>

              <View>
                <Text className="text-indigo-100 text-[10px] uppercase font-bold tracking-wider">Savings Rate</Text>
                <Text className="text-white text-base font-extrabold mt-0.5">
                  {savingsRate.toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Offline SMART INSIGHTS section */}
        <Animated.View entering={FadeIn.delay(300)} className="px-6 mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <Text className="text-white text-base font-bold tracking-tight">Smart Offline Insights</Text>
            </View>
            <Text className="text-zinc-500 text-xs font-medium">Local AI Engine</Text>
          </View>

          <View className="space-y-2.5">
            {insights.map((insight) => (
              <View 
                key={insight.id}
                className={`p-4 rounded-2xl border flex-row items-start space-x-3 ${
                  insight.type === 'danger' 
                    ? 'bg-rose-500/10 border-rose-500/20' 
                    : insight.type === 'warning' 
                    ? 'bg-amber-500/10 border-amber-500/20' 
                    : 'bg-indigo-500/5 border-indigo-500/10'
                }`}
              >
                <View className={`p-1.5 rounded-lg ${
                  insight.type === 'danger' ? 'bg-rose-500/20 text-rose-400' : insight.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xs font-bold">{insight.title}</Text>
                  <Text className="text-zinc-400 text-xs mt-1 leading-normal font-medium">{insight.description}</Text>
                </View>
                <Text className="text-[10px] text-zinc-500 font-semibold">{insight.timestamp}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Recent Transactions List with quick redirection */}
        <Animated.View entering={FadeIn.delay(400)} className="px-6 mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white text-base font-bold tracking-tight">Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')} className="flex-row items-center space-x-1">
              <Text className="text-indigo-400 text-xs font-bold">See All</Text>
              <ChevronRight className="w-4 h-4 text-indigo-400" />
            </TouchableOpacity>
          </View>

          <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-2.5 space-y-1">
            {monthlyTransactions.slice(0, 4).map((tx) => (
              <View key={tx.id} className="flex-row justify-between items-center p-3 rounded-2xl hover:bg-zinc-800/40 border-b border-zinc-800/20 last:border-0">
                <View className="flex-row items-center space-x-3">
                  <View className={`w-10 h-10 rounded-full items-center justify-center ${
                    tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                  }`}>
                    {tx.type === 'income' ? (
                      <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5 text-rose-400" />
                    )}
                  </View>
                  <View>
                    <Text numberOfLines={1} className="text-white text-xs font-bold max-w-[150px]">{tx.merchant}</Text>
                    <Text className="text-zinc-500 text-[10px] font-semibold mt-0.5">{tx.category} • {tx.bank}</Text>
                  </View>
                </View>

                <View className="items-end">
                  <Text className={`text-xs font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-zinc-100'}`}>
                    {tx.type === 'income' ? '+' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
                  </Text>
                  <Text className="text-[10px] text-zinc-500 font-semibold mt-0.5">{tx.date}</Text>
                </View>
              </View>
            ))}

            {monthlyTransactions.length === 0 && (
              <View className="py-8 items-center justify-center">
                <MessageSquare className="w-8 h-8 text-zinc-600 mb-2" />
                <Text className="text-zinc-500 text-xs font-semibold">No SMS Transactions for this month</Text>
                <Text className="text-zinc-600 text-[10px] mt-1">Simulate an incoming bank SMS alert</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
