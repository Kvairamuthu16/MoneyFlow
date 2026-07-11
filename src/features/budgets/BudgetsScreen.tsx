import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Sparkles, Sliders, AlertCircle, Plus, Check } from 'lucide-react-native';
import { AppStorage } from '../../storage/mmkv';
import { Budget } from '../../types';

export default function BudgetsScreen() {
  const settings = useMemo(() => AppStorage.getSettings(), []);
  const [budgets, setBudgets] = useState<Budget[]>(() => AppStorage.getBudgets());
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [customLimit, setCustomLimit] = useState('');

  const currencySymbol = settings.currency === 'INR' ? '₹' : settings.currency === 'USD' ? '$' : '€';

  const handleUpdateLimit = (category: string) => {
    const limitNum = parseFloat(customLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      Alert.alert('Invalid limit', 'Please enter a valid numeric value.');
      return;
    }

    const updated = budgets.map(b => b.category === category ? { ...b, limit: limitNum } : b);
    setBudgets(updated);
    AppStorage.saveBudgets(updated);
    setEditingCategory(null);
    setCustomLimit('');
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header Title */}
        <View className="px-6 py-4">
          <Text className="text-zinc-500 text-xs font-semibold tracking-wider uppercase">Limits Manager</Text>
          <Text className="text-white text-xl font-black">Monthly Budgets</Text>
        </View>

        {/* Dynamic Alerts Banner */}
        <View className="mx-6 mb-6 bg-indigo-950/20 border border-indigo-800/30 p-4 rounded-3xl flex-row items-start space-x-3">
          <Sparkles className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0 animate-pulse" />
          <View className="flex-1">
            <Text className="text-white text-xs font-bold">Smart Alerts Configured</Text>
            <Text className="text-zinc-400 text-xs mt-1 leading-relaxed font-medium">
              We monitor expenditures in real-time. Reaching <Text className="text-orange-400 font-bold">80%</Text> triggers amber warnings, while exceeding <Text className="text-rose-400 font-bold">100%</Text> highlights crimson alerts.
            </Text>
          </View>
        </View>

        {/* Budgets List */}
        <View className="space-y-3 px-6">
          {budgets.map((budget) => {
            const pct = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
            const remaining = budget.limit - budget.spent;

            // Define status color based on expenditure
            let progressColor = 'bg-indigo-500'; // under 50%
            let textColor = 'text-indigo-400';
            if (pct >= 120) {
              progressColor = 'bg-rose-600'; // overspent danger
              textColor = 'text-rose-500';
            } else if (pct >= 100) {
              progressColor = 'bg-rose-500';
              textColor = 'text-rose-500';
            } else if (pct >= 80) {
              progressColor = 'bg-amber-500'; // warning
              textColor = 'text-amber-500';
            } else if (pct >= 50) {
              progressColor = 'bg-indigo-600';
            }

            return (
              <Animated.View 
                entering={FadeIn}
                key={budget.category}
                className="bg-zinc-900 border border-zinc-800/80 rounded-3xl p-5"
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View>
                    <Text className="text-white text-sm font-black">{budget.category}</Text>
                    <Text className="text-zinc-500 text-[10px] font-semibold mt-0.5">
                      {pct.toFixed(0)}% Utilized
                    </Text>
                  </View>
                  
                  {editingCategory === budget.category ? (
                    <View className="flex-row items-center space-x-2">
                      <TextInput 
                        placeholder="Limit"
                        placeholderTextColor="#71717A"
                        value={customLimit}
                        onChangeText={setCustomLimit}
                        keyboardType="numeric"
                        className="bg-zinc-950 text-white text-xs px-3 py-1.5 rounded-xl border border-zinc-800 w-20 p-0 text-center font-bold"
                      />
                      <TouchableOpacity 
                        onPress={() => handleUpdateLimit(budget.category)}
                        className="p-1.5 bg-emerald-500 rounded-lg"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      onPress={() => {
                        setEditingCategory(budget.category);
                        setCustomLimit(budget.limit.toString());
                      }}
                      className="p-1.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl"
                    >
                      <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Progress bar and remaining balance info */}
                <View className="space-y-2">
                  <View className="h-2 bg-zinc-950 rounded-full overflow-hidden">
                    <View 
                      style={{ width: `${Math.min(100, pct)}%` }}
                      className={`h-full rounded-full ${progressColor}`}
                    />
                  </View>

                  <View className="flex-row justify-between text-xs pt-1">
                    <Text className="text-zinc-400 font-medium">
                      Spent: <Text className="text-white font-bold">{currencySymbol}{budget.spent.toFixed(2)}</Text>
                    </Text>
                    <Text className="text-zinc-400 font-medium">
                      Limit: <Text className="text-zinc-500 font-bold">{currencySymbol}{budget.limit.toFixed(0)}</Text>
                    </Text>
                  </View>

                  {/* Remaining balance text */}
                  <View className="pt-2 border-t border-zinc-800/20 flex-row justify-between items-center">
                    <Text className="text-zinc-500 text-[10px] font-semibold uppercase">Remaining Limit</Text>
                    <Text className={`text-xs font-black ${remaining >= 0 ? textColor : 'text-rose-500'}`}>
                      {remaining >= 0 ? `${currencySymbol}${remaining.toFixed(2)}` : `Overspent by ${currencySymbol}${Math.abs(remaining).toFixed(2)}`}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
