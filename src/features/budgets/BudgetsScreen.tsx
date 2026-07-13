import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Sparkles, Sliders, Plus, Check, TrendingUp, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react-native';
import { useAppData, useCurrency } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../../components/Card';
import { ProgressBar, budgetTone } from '../../components/ProgressBar';
import { Button } from '../../components/Button';
import { getDaysElapsed, getDaysInMonth } from '../../utils/date';
import { Budget } from '../../types';

function healthScore(budgets: Budget[]): number | null {
  const withLimits = budgets.filter((b) => b.limit > 0);
  if (withLimits.length === 0) return null;

  const scores = withLimits.map((b) => {
    const utilization = b.spent / b.limit;
    if (utilization <= 0.8) return 100;
    if (utilization <= 1.0) return 100 - ((utilization - 0.8) / 0.2) * 50;
    return Math.max(0, 50 - ((utilization - 1.0) / 0.5) * 50);
  });

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function healthLabel(score: number): { label: string; tone: 'success' | 'warning' | 'danger' } {
  if (score >= 80) return { label: 'Excellent', tone: 'success' };
  if (score >= 60) return { label: 'Good', tone: 'success' };
  if (score >= 40) return { label: 'Needs Attention', tone: 'warning' };
  return { label: 'Critical', tone: 'danger' };
}

export default function BudgetsScreen() {
  const theme = useTheme();
  const { format } = useCurrency();
  const { settings, budgets, addBudget, updateBudgetLimit, deleteBudget } = useAppData();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [customLimit, setCustomLimit] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');

  const daysElapsed = getDaysElapsed(settings.selectedMonth);
  const daysInMonth = getDaysInMonth(settings.selectedMonth);

  const score = useMemo(() => healthScore(budgets), [budgets]);
  const scoreInfo = score !== null ? healthLabel(score) : null;

  const forecasts = useMemo(() => {
    return budgets
      .filter((b) => b.limit > 0)
      .map((b) => {
        const projected = daysElapsed > 0 ? (b.spent / daysElapsed) * daysInMonth : b.spent;
        return { ...b, projected };
      })
      .filter((b) => b.projected > b.limit && b.spent < b.limit)
      .sort((a, b) => b.projected - b.limit - (a.projected - a.limit));
  }, [budgets, daysElapsed, daysInMonth]);

  const handleUpdateLimit = (category: string) => {
    const limitNum = parseFloat(customLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      Alert.alert('Invalid limit', 'Please enter a valid numeric value.');
      return;
    }
    updateBudgetLimit(category, limitNum);
    setEditingCategory(null);
    setCustomLimit('');
  };

  const handleAddBudget = () => {
    const limitNum = parseFloat(newLimit);
    if (!newCategory.trim()) {
      Alert.alert('Missing Category', 'Please enter a category name.');
      return;
    }
    if (isNaN(limitNum) || limitNum <= 0) {
      Alert.alert('Invalid limit', 'Please enter a valid numeric value.');
      return;
    }
    addBudget({ category: newCategory.trim(), limit: limitNum });
    setNewCategory('');
    setNewLimit('');
    setShowAddModal(false);
  };

  const handleDelete = (category: string) => {
    Alert.alert('Remove Budget', `Remove the "${category}" budget category?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteBudget(category) }
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Title */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Limits Manager</Text>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' }}>Monthly Budgets</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Health Score Card */}
        {score !== null && scoreInfo && (
          <Animated.View entering={FadeIn} style={{ paddingHorizontal: 24, marginBottom: 16 }}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    scoreInfo.tone === 'success' ? `${theme.colors.success}22` : scoreInfo.tone === 'warning' ? `${theme.colors.warning}22` : `${theme.colors.danger}22`
                }}
              >
                {scoreInfo.tone === 'danger' ? (
                  <ShieldAlert size={24} color={theme.colors.danger} />
                ) : (
                  <ShieldCheck size={24} color={scoreInfo.tone === 'warning' ? theme.colors.warning : theme.colors.success} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Budget Health Score</Text>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' }}>
                  {score}
                  <Text style={{ fontSize: 12, color: theme.colors.textMuted }}> / 100</Text>
                </Text>
                <Text
                  style={{
                    color: scoreInfo.tone === 'warning' ? theme.colors.warning : scoreInfo.tone === 'danger' ? theme.colors.danger : theme.colors.success,
                    fontSize: 11,
                    fontWeight: '700'
                  }}
                >
                  {scoreInfo.label}
                </Text>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Overspend Forecast */}
        {forecasts.length > 0 && (
          <Animated.View entering={FadeIn.delay(50)} style={{ paddingHorizontal: 24, marginBottom: 16 }}>
            <Card style={{ backgroundColor: `${theme.colors.warning}14`, borderColor: `${theme.colors.warning}33`, flexDirection: 'row', gap: 12 }}>
              <TrendingUp size={18} color={theme.colors.warning} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>Overspend Forecast</Text>
                {forecasts.slice(0, 3).map((f) => (
                  <Text key={f.category} style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                    <Text style={{ fontWeight: '700' }}>{f.category}</Text> is on track to hit {format(f.projected)}, {format(f.projected - f.limit)} over your{' '}
                    {format(f.limit)} limit.
                  </Text>
                ))}
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Dynamic Alerts Banner */}
        <View style={{ marginHorizontal: 24, marginBottom: 16 }}>
          <Card style={{ backgroundColor: theme.colors.accentMuted, borderColor: `${theme.colors.accent}33`, flexDirection: 'row', gap: 12 }}>
            <Sparkles size={18} color={theme.colors.accent} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' }}>Smart Alerts Configured</Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                We monitor expenditures in real-time. Reaching <Text style={{ color: theme.colors.warning, fontWeight: '700' }}>80%</Text> triggers amber
                warnings, while exceeding <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>100%</Text> highlights crimson alerts.
              </Text>
            </View>
          </Card>
        </View>

        {/* Budgets List */}
        <View style={{ paddingHorizontal: 24, gap: 12 }}>
          {budgets.map((budget) => {
            const pct = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
            const remaining = budget.limit - budget.spent;
            const tone = budgetTone(pct);
            const toneColor = tone === 'danger' ? theme.colors.danger : tone === 'warning' ? theme.colors.warning : theme.colors.success;

            return (
              <Animated.View entering={FadeIn} key={budget.category}>
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <View>
                      <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: '800' }}>{budget.category}</Text>
                      <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 }}>{pct.toFixed(0)}% Utilized</Text>
                    </View>

                    {editingCategory === budget.category ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TextInput
                          placeholder="Limit"
                          placeholderTextColor={theme.colors.textMuted}
                          value={customLimit}
                          onChangeText={setCustomLimit}
                          keyboardType="numeric"
                          style={{
                            backgroundColor: theme.colors.background,
                            color: theme.colors.textPrimary,
                            fontSize: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            width: 80,
                            textAlign: 'center',
                            fontWeight: '700'
                          }}
                        />
                        <TouchableOpacity
                          onPress={() => handleUpdateLimit(budget.category)}
                          style={{ padding: 8, backgroundColor: theme.colors.success, borderRadius: 10 }}
                        >
                          <Check size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingCategory(budget.category);
                            setCustomLimit(budget.limit.toString());
                          }}
                          style={{ padding: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10 }}
                        >
                          <Sliders size={14} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(budget.category)}
                          style={{ padding: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10 }}
                        >
                          <Trash2 size={14} color={theme.colors.danger} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View style={{ gap: 8 }}>
                    <ProgressBar percent={pct} tone={tone} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                        Spent: <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{format(budget.spent)}</Text>
                      </Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                        Limit: <Text style={{ color: theme.colors.textMuted, fontWeight: '700' }}>{format(budget.limit)}</Text>
                      </Text>
                    </View>

                    <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Remaining Limit</Text>
                      <Text style={{ color: remaining >= 0 ? toneColor : theme.colors.danger, fontSize: 12, fontWeight: '800' }}>
                        {remaining >= 0 ? format(remaining) : `Overspent by ${format(Math.abs(remaining))}`}
                      </Text>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            );
          })}

          {budgets.length === 0 && (
            <Card>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, textAlign: 'center' }}>
                No budgets yet. Tap the + button above to create your first one.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Add Budget Modal */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setShowAddModal(false)}>
          <Pressable
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              padding: 24,
              gap: 16
            }}
          >
            <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' }}>New Budget Category</Text>
            <View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 }}>Category Name</Text>
              <TextInput
                placeholder="e.g. Fuel"
                placeholderTextColor={theme.colors.textMuted}
                value={newCategory}
                onChangeText={setNewCategory}
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.textPrimary,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 13
                }}
              />
            </View>
            <View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 }}>Monthly Limit</Text>
              <TextInput
                placeholder="e.g. 4000"
                placeholderTextColor={theme.colors.textMuted}
                value={newLimit}
                onChangeText={setNewLimit}
                keyboardType="numeric"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.textPrimary,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 13
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setShowAddModal(false)} />
              <Button label="Add Budget" variant="primary" style={{ flex: 1 }} onPress={handleAddBudget} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
