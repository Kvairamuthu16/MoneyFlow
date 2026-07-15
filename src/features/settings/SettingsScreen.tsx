import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Share, Modal, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { User, Moon, Sun, Monitor, Coins, Database, FileSpreadsheet, Sparkles, Lock, Upload, Users, FileText } from 'lucide-react-native';
import { useAppData } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { AppSettings } from '../../types';
import { LockScreen } from '../lock/LockScreen';
import { ContactResolverService } from '../../services/sms';

const THEME_OPTIONS: { value: AppSettings['theme']; label: string; icon: (color: string) => React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: (c) => <Sun size={14} color={c} /> },
  { value: 'dark', label: 'Dark', icon: (c) => <Moon size={14} color={c} /> },
  { value: 'system', label: 'System', icon: (c) => <Monitor size={14} color={c} /> }
];

const CURRENCY_OPTIONS: { value: AppSettings['currency']; label: string }[] = [
  { value: 'INR', label: '₹ Rupees' },
  { value: 'USD', label: '$ Dollars' },
  { value: 'EUR', label: '€ Euros' },
  { value: 'GBP', label: '£ Pounds' }
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, updateSettings, clearAllData, exportBackup, importBackup } = useAppData();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);

  const handleBiometricToggle = (value: boolean) => {
    if (value) {
      setShowPinSetup(true);
    } else {
      updateSettings({ biometricLockEnabled: false });
    }
  };

  const handleContactsToggle = async (value: boolean) => {
    if (!value) {
      updateSettings({ contactsPermissionGranted: false });
      return;
    }
    const granted = await ContactResolverService.requestPermission();
    updateSettings({ contactsPermissionGranted: granted });
    if (!granted) {
      Alert.alert('Permission Denied', 'Contact name resolution will stay off until you grant contacts access.');
    }
  };

  const handleRawSmsToggle = (value: boolean) => {
    updateSettings({ storeRawSmsBody: value });
  };

  const handleReset = () => {
    Alert.alert(
      'Factory Reset App',
      'This will erase all locally stored transaction and budget data. This action is IRREVERSIBLE.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase Everything',
          style: 'destructive',
          onPress: () => {
            clearAllData();
            Alert.alert('Erase Complete', 'Your storage is cleared successfully.');
          }
        }
      ]
    );
  };

  const handleExport = async () => {
    try {
      const backup = exportBackup();
      const json = JSON.stringify(backup, null, 2);
      await Share.share({
        title: 'MoneyFlow AI Backup',
        message: json
      });
    } catch (error: any) {
      Alert.alert('Export Failed', error?.message || 'Could not export your data.');
    }
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText);
      const ok = importBackup(parsed);
      if (ok) {
        setShowImportModal(false);
        setImportText('');
        Alert.alert('Import Successful', 'Your backup has been restored.');
      } else {
        Alert.alert('Invalid Backup', "That doesn't look like a valid MoneyFlow AI backup file.");
      }
    } catch {
      Alert.alert('Invalid JSON', 'Could not parse the pasted backup text.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>System Console</Text>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' }}>Preferences</Text>
        </View>

        {/* User Card */}
        <Animated.View entering={FadeIn} style={{ marginHorizontal: 24, marginBottom: 24 }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <User size={22} color="#fff" />
            </View>
            <View>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: '800' }}>Fintech Explorer</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 }}>Secure Offline Sandbox Mode</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Appearance */}
        <Animated.View entering={FadeIn.delay(80)} style={{ paddingHorizontal: 24, marginBottom: 24, gap: 10 }}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', paddingLeft: 4 }}>Aesthetic Customization</Text>

          <Card style={{ gap: 16 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <View style={{ padding: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12 }}>
                  <Moon size={16} color={theme.colors.accent} />
                </View>
                <View>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Theme</Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }}>Choose your appearance</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {THEME_OPTIONS.map((opt) => {
                  const selected = settings.theme === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => updateSettings({ theme: opt.value })}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: selected ? theme.colors.accent : theme.colors.border,
                        backgroundColor: selected ? theme.colors.accentMuted : 'transparent'
                      }}
                    >
                      {opt.icon(selected ? theme.colors.accent : theme.colors.textMuted)}
                      <Text style={{ color: selected ? theme.colors.accent : theme.colors.textMuted, fontSize: 11, fontWeight: '700' }}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <View style={{ padding: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12 }}>
                  <Coins size={16} color={theme.colors.success} />
                </View>
                <View>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Local Currency</Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }}>Primary pricing system</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CURRENCY_OPTIONS.map((curr) => {
                  const selected = settings.currency === curr.value;
                  return (
                    <TouchableOpacity
                      key={curr.value}
                      onPress={() => updateSettings({ currency: curr.value })}
                      style={{
                        flexBasis: '47%',
                        flexGrow: 1,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        alignItems: 'center',
                        borderColor: selected ? theme.colors.success : theme.colors.border,
                        backgroundColor: selected ? `${theme.colors.success}1A` : 'transparent'
                      }}
                    >
                      <Text style={{ color: selected ? theme.colors.success : theme.colors.textMuted, fontSize: 11, fontWeight: '700' }}>{curr.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Security & Data utilities */}
        <Animated.View entering={FadeIn.delay(160)} style={{ paddingHorizontal: 24, marginBottom: 24, gap: 10 }}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', paddingLeft: 4 }}>Data & Privacy Control</Text>

          <Card padded={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ padding: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12 }}>
                  <Lock size={16} color={theme.colors.accent} />
                </View>
                <View>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Biometric Screen Lock</Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }}>Use Face ID / Fingerprint on launch</Text>
                </View>
              </View>
              <Switch
                value={settings.biometricLockEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ padding: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12 }}>
                  <Users size={16} color={theme.colors.accent} />
                </View>
                <View>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Resolve Contact Names</Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }}>Show "John Kumar" instead of a UPI ID/number</Text>
                </View>
              </View>
              <Switch
                value={settings.contactsPermissionGranted}
                onValueChange={handleContactsToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ padding: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12 }}>
                  <FileText size={16} color={theme.colors.accent} />
                </View>
                <View>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Store Raw SMS Text</Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }}>Off by default -- only structured fields are kept</Text>
                </View>
              </View>
              <Switch
                value={settings.storeRawSmsBody}
                onValueChange={handleRawSmsToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
              />
            </View>

            <TouchableOpacity
              onPress={handleExport}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ padding: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12 }}>
                  <FileSpreadsheet size={16} color={theme.colors.success} />
                </View>
                <View>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Export Backup</Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }}>Share your data as a JSON backup file</Text>
                </View>
              </View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 14, fontWeight: '700' }}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowImportModal(true)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ padding: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12 }}>
                  <Upload size={16} color={theme.colors.accent} />
                </View>
                <View>
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Restore From Backup</Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }}>Paste a previously exported backup</Text>
                </View>
              </View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 14, fontWeight: '700' }}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleReset} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ padding: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12 }}>
                  <Database size={16} color={theme.colors.danger} />
                </View>
                <View>
                  <Text style={{ color: theme.colors.danger, fontSize: 12, fontWeight: '700' }}>Factory Hard Reset</Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }}>Erase all offline SMS logs</Text>
                </View>
              </View>
              <Text style={{ color: theme.colors.danger, fontSize: 14, fontWeight: '700' }}>→</Text>
            </TouchableOpacity>
          </Card>
        </Animated.View>

        {/* Offline Disclaimer */}
        <View style={{ paddingHorizontal: 40, paddingVertical: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Sparkles size={12} color={theme.colors.textMuted} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 10, textAlign: 'center', fontWeight: '700', textTransform: 'uppercase' }}>
              100% Offline • No Backend • MMKV Encrypted
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Restore From Backup Modal */}
      <Modal visible={showImportModal} transparent animationType="fade" onRequestClose={() => setShowImportModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setShowImportModal(false)}>
          <Pressable style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, padding: 24, gap: 14 }}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' }}>Restore From Backup</Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>Paste the JSON contents of a previously exported backup file.</Text>
            <TextInput
              multiline
              numberOfLines={8}
              value={importText}
              onChangeText={setImportText}
              placeholder="{ &quot;version&quot;: 1, ... }"
              placeholderTextColor={theme.colors.textMuted}
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.textPrimary,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 12,
                padding: 12,
                fontSize: 11,
                height: 160,
                textAlignVertical: 'top'
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setShowImportModal(false)} />
              <Button label="Restore" variant="primary" style={{ flex: 1 }} onPress={handleImport} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Biometric Lock Setup */}
      <Modal visible={showPinSetup} animationType="slide" onRequestClose={() => setShowPinSetup(false)}>
        <LockScreen
          mode="setup"
          onSuccess={() => {
            setShowPinSetup(false);
            updateSettings({ biometricLockEnabled: true });
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}
