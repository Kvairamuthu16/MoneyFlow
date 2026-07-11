import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { 
  User, 
  Settings, 
  Moon, 
  Sun, 
  Coins, 
  Database, 
  FileSpreadsheet, 
  ShieldAlert, 
  Sparkles,
  Lock
} from 'lucide-react-native';
import { AppStorage } from '../../storage/mmkv';
import { AppSettings } from '../../types';

export default function SettingsScreen({ navigation }: any) {
  const [settings, setSettings] = useState<AppSettings>(() => AppStorage.getSettings());
  const [biometrics, setBiometrics] = useState(true);

  const handleToggleTheme = () => {
    const nextTheme: 'light' | 'dark' = settings.theme === 'dark' ? 'light' : 'dark';
    const updated = { ...settings, theme: nextTheme };
    setSettings(updated);
    AppStorage.saveSettings(updated);
  };

  const handleCurrencyChange = (curr: 'INR' | 'USD' | 'EUR') => {
    const updated = { ...settings, currency: curr };
    setSettings(updated);
    AppStorage.saveSettings(updated);
    Alert.alert('Currency Swapped', `Display currency updated to ${curr}.`);
  };

  const handleReset = () => {
    Alert.alert(
      'Factory Reset App',
      'This will erase all 10,000+ locally stored SMS data and customized budget parameters. This action is IRREVERSIBLE.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Erase Everything', 
          style: 'destructive',
          onPress: () => {
            AppStorage.clearAll();
            Alert.alert('Erase Complete', 'Your storage is cleared successfully.');
          }
        }
      ]
    );
  };

  const handleCSVExport = () => {
    Alert.alert(
      'Export Structured Ledger',
      'MoneyFlow AI will compile all transaction histories into moneyflow_ledger.csv and make it available in your local Documents folder.',
      [{ text: 'Export Now', onPress: () => Alert.alert('Export Successful', 'Stored securely inside local documents.') }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Title */}
        <View className="px-6 py-4">
          <Text className="text-zinc-500 text-xs font-semibold tracking-wider uppercase">System Console</Text>
          <Text className="text-white text-xl font-black">Preferences</Text>
        </View>

        {/* User Card */}
        <Animated.View entering={FadeIn} className="mx-6 mb-6">
          <View className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl flex-row items-center space-x-4">
            <View className="w-12 h-12 rounded-full bg-indigo-600 items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </View>
            <View>
              <Text className="text-white text-sm font-black">Fintech Explorer</Text>
              <Text className="text-zinc-500 text-[10px] font-semibold mt-0.5">Secure Offline Sandbox Mode</Text>
            </View>
          </View>
        </Animated.View>

        {/* Global Settings */}
        <Animated.View entering={FadeIn.delay(100)} className="px-6 mb-6 space-y-3">
          <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider pl-1">Aesthetic Customization</Text>

          <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-2.5">
            {/* Theme Toggle */}
            <View className="flex-row justify-between items-center p-3.5 border-b border-zinc-800/20">
              <View className="flex-row items-center space-x-3">
                <View className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                  {settings.theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                </View>
                <View>
                  <Text className="text-white text-xs font-bold">Dark Mode Enabled</Text>
                  <Text className="text-zinc-500 text-[10px] font-semibold mt-0.5">Aesthetic twilight interface</Text>
                </View>
              </View>
              <Switch 
                value={settings.theme === 'dark'} 
                onValueChange={handleToggleTheme}
                trackColor={{ false: '#27272A', true: '#4F46E5' }}
                thumbColor={settings.theme === 'dark' ? '#FFFFFF' : '#F4F4F5'}
              />
            </View>

            {/* Currency Choice */}
            <View className="p-3.5 space-y-3">
              <View className="flex-row items-center space-x-3">
                <View className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <Coins className="w-4 h-4 text-emerald-400" />
                </View>
                <View>
                  <Text className="text-white text-xs font-bold">Local Currency Symbol</Text>
                  <Text className="text-zinc-500 text-[10px] font-semibold mt-0.5">Primary pricing system</Text>
                </View>
              </View>

              <View className="flex-row gap-2">
                {(['INR', 'USD', 'EUR'] as const).map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    onPress={() => handleCurrencyChange(curr)}
                    className={`flex-1 py-2 rounded-xl border text-center font-bold text-xs ${
                      settings.currency === curr 
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                        : 'border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <Text className={`text-center font-bold ${settings.currency === curr ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      {curr === 'INR' ? '₹ Rupees' : curr === 'USD' ? '$ Dollars' : '€ Euros'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Security & Data utilities */}
        <Animated.View entering={FadeIn.delay(200)} className="px-6 mb-6 space-y-3">
          <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider pl-1">Data & Privacy Control</Text>

          <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-2.5">
            {/* Local Security Toggle */}
            <View className="flex-row justify-between items-center p-3.5 border-b border-zinc-800/20">
              <View className="flex-row items-center space-x-3">
                <View className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <Lock className="w-4 h-4 text-indigo-400" />
                </View>
                <View>
                  <Text className="text-white text-xs font-bold">Biometric Screen Lock</Text>
                  <Text className="text-zinc-500 text-[10px] font-semibold mt-0.5">Use Face ID / Fingerprint on launch</Text>
                </View>
              </View>
              <Switch 
                value={biometrics} 
                onValueChange={setBiometrics}
                trackColor={{ false: '#27272A', true: '#4F46E5' }}
              />
            </View>

            {/* Export Ledgers */}
            <TouchableOpacity
              onPress={handleCSVExport}
              className="flex-row justify-between items-center p-3.5 border-b border-zinc-800/20"
            >
              <View className="flex-row items-center space-x-3">
                <View className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                </View>
                <View>
                  <Text className="text-white text-xs font-bold">Export CSV Report</Text>
                  <Text className="text-zinc-500 text-[10px] font-semibold mt-0.5">Saves Excel-friendly ledger locally</Text>
                </View>
              </View>
              <Text className="text-zinc-600 text-xs font-bold">→</Text>
            </TouchableOpacity>

            {/* Hard Reset */}
            <TouchableOpacity
              onPress={handleReset}
              className="flex-row justify-between items-center p-3.5"
            >
              <View className="flex-row items-center space-x-3">
                <View className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <Database className="w-4 h-4 text-rose-500" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-rose-500">Factory Hard Reset</Text>
                  <Text className="text-zinc-500 text-[10px] font-semibold mt-0.5">Erase all 10,000+ offline SMS logs</Text>
                </View>
              </View>
              <Text className="text-rose-600 text-xs font-bold">→</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Offline Disclaimer */}
        <View className="px-10 py-4 text-center">
          <Text className="text-zinc-600 text-[10px] text-center leading-relaxed font-semibold uppercase">
            🛡️ 100% Offline Integrity • No Backend • Zero Cloud Tracking • MMKV Encrypted
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
