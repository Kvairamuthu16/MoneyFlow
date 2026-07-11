import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeIn } from 'react-native-reanimated';
import { 
  Search, 
  SlidersHorizontal, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Trash2, 
  Edit3, 
  ArrowUpDown
} from 'lucide-react-native';
import { AppStorage } from '../../storage/mmkv';
import { Transaction } from '../../types';

export default function TransactionsScreen() {
  const settings = useMemo(() => AppStorage.getSettings(), []);
  const [transactions, setTransactions] = useState<Transaction[]>(() => AppStorage.getTransactions());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  const currencySymbol = settings.currency === 'INR' ? '₹' : settings.currency === 'USD' ? '$' : '€';

  // Categories list
  const categories = useMemo(() => {
    const list = new Set(transactions.map(t => t.category));
    return ['All', ...Array.from(list)];
  }, [transactions]);

  const [selectedCategory, setSelectedCategory] = useState('All');

  // Filter & Sort
  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.merchant.toLowerCase().includes(q) || 
        t.bank.toLowerCase().includes(q) ||
        (t.sourceText && t.sourceText.toLowerCase().includes(q))
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(t => t.type === typeFilter);
    }

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter(t => t.category === selectedCategory);
    }

    // Sort
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
  }, [transactions, searchQuery, typeFilter, selectedCategory, sortBy]);

  const handleDelete = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    AppStorage.saveTransactions(updated);
  };

  const handleCategoryChange = (id: string, newCategory: string) => {
    const updated = transactions.map(t => t.id === id ? { ...t, category: newCategory } : t);
    setTransactions(updated);
    AppStorage.saveTransactions(updated);
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    return (
      <Animated.View entering={FadeIn} className="mx-6 mb-2.5">
        <View className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl flex-row justify-between items-center relative overflow-hidden">
          <View className="flex-row items-center space-x-3 flex-1 mr-3">
            <View className={`w-10 h-10 rounded-full items-center justify-center ${
              item.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
            }`}>
              {item.type === 'income' ? (
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
              ) : (
                <ArrowDownLeft className="w-5 h-5 text-rose-400" />
              )}
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="text-white text-sm font-bold">{item.merchant}</Text>
              <Text className="text-zinc-500 text-[10px] font-semibold mt-0.5">
                {item.category} • {item.bank} • {item.paymentMethod}
              </Text>
              {item.sourceText && (
                <Text numberOfLines={1} className="text-zinc-600 text-[9px] mt-1 leading-relaxed font-medium">
                  "{item.sourceText}"
                </Text>
              )}
            </View>
          </View>

          <View className="items-end shrink-0">
            <Text className={`text-sm font-extrabold ${item.type === 'income' ? 'text-emerald-400' : 'text-zinc-100'}`}>
              {item.type === 'income' ? '+' : '-'}{currencySymbol}{item.amount.toLocaleString()}
            </Text>
            <Text className="text-[10px] text-zinc-500 font-semibold mt-0.5">{item.date}</Text>

            {/* Micro Quick Actions */}
            <View className="flex-row items-center space-x-2 mt-2">
              <TouchableOpacity 
                onPress={() => handleDelete(item.id)}
                className="p-1 hover:bg-rose-500/10 rounded-md"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  const nextCats = ['Food', 'Groceries', 'Shopping', 'Bills', 'Travel', 'Entertainment', 'Salary', 'Other'];
                  const curIdx = nextCats.indexOf(item.category);
                  const nextCat = nextCats[(curIdx + 1) % nextCats.length];
                  handleCategoryChange(item.id, nextCat);
                }}
                className="p-1 hover:bg-indigo-500/10 rounded-md"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      {/* Search Header */}
      <View className="px-6 py-4 border-b border-zinc-900">
        <Text className="text-white text-xl font-black mb-3">SMS Ledger</Text>
        <View className="flex-row items-center space-x-2">
          <View className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex-row items-center px-4 py-2.5">
            <Search className="w-4 h-4 text-zinc-500 mr-2" />
            <TextInput 
              placeholder="Search merchants, banks, ref numbers..."
              placeholderTextColor="#71717A"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="text-white text-xs font-medium flex-1 p-0"
            />
          </View>
          <TouchableOpacity 
            onPress={() => setShowFilters(!showFilters)}
            className={`p-3 bg-zinc-900 border rounded-2xl ${
              showFilters ? 'border-indigo-500 text-indigo-400' : 'border-zinc-800 text-zinc-400'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Advanced Filter Pane */}
      {showFilters && (
        <Animated.View entering={FadeIn} className="bg-zinc-900/60 border-b border-zinc-900 py-4 px-6 space-y-4">
          {/* Type filters */}
          <View>
            <Text className="text-zinc-500 text-[10px] font-bold uppercase mb-2">Transaction Type</Text>
            <View className="flex-row gap-2">
              {(['all', 'income', 'expense'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setTypeFilter(type)}
                  className={`px-4 py-1.5 rounded-full border text-xs font-bold capitalize ${
                    typeFilter === type 
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                      : 'border-zinc-800 text-zinc-400'
                  }`}
                >
                  <Text className={typeFilter === type ? 'text-indigo-400' : 'text-zinc-400'}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort By options */}
          <View>
            <Text className="text-zinc-500 text-[10px] font-bold uppercase mb-2">Sort Order</Text>
            <View className="flex-row flex-wrap gap-2">
              {(['newest', 'oldest', 'highest', 'lowest'] as const).map((sort) => (
                <TouchableOpacity
                  key={sort}
                  onPress={() => setSortBy(sort)}
                  className={`px-4 py-1.5 rounded-full border text-xs font-bold capitalize flex-row items-center space-x-1 ${
                    sortBy === sort 
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                      : 'border-zinc-800 text-zinc-400'
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  <Text className={sortBy === sort ? 'text-indigo-400' : 'text-zinc-400'}>{sort}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      )}

      {/* Categories Horizontal scroll */}
      <View className="py-3">
        <FlashList 
          horizontal
          estimatedItemSize={80}
          data={categories}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => setSelectedCategory(item)}
              className={`mr-2 px-4 py-2 rounded-2xl border text-xs font-bold ${
                selectedCategory === item 
                  ? 'bg-white border-white text-zinc-950' 
                  : 'bg-zinc-900 border-zinc-800/60 text-zinc-400'
              }`}
            >
              <Text className={selectedCategory === item ? 'text-zinc-950 font-bold' : 'text-zinc-400 font-medium'}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Main FlashList - High efficiency rendering for 10,000+ items */}
      <View className="flex-1">
        <FlashList 
          data={processedTransactions}
          renderItem={renderItem}
          estimatedItemSize={120}
          ListEmptyComponent={
            <View className="py-24 items-center justify-center">
              <Text className="text-zinc-500 text-sm font-semibold">No transactions match your filters</Text>
              <Text className="text-zinc-600 text-xs mt-1">Try resetting the search query or sorting</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
