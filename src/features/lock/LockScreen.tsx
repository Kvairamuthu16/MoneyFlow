import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { getTheme } from '../../theme';
import { hasPin, setPin, verifyPin } from '../../storage/pinAuth';
import { isBiometricsAvailable, promptBiometricUnlock } from '../../services/biometrics';

const PIN_LENGTH = 4;
const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del']
];

interface LockScreenProps {
  /** 'setup' captures and confirms a new PIN; 'unlock' verifies against the stored one. */
  mode: 'setup' | 'unlock';
  biometricEnabled?: boolean;
  onSuccess: () => void;
}

/**
 * Self-styled (doesn't use ThemeContext) because it can render before
 * AppDataProvider/ThemeProvider mount, during the storage-init lock gate.
 */
export function LockScreen({ mode, biometricEnabled, onSuccess }: LockScreenProps) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'light' ? 'light' : 'dark');

  const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [digits, setDigits] = useState('');
  const [error, setError] = useState('');
  const [biometricTried, setBiometricTried] = useState(false);

  const tryBiometric = useCallback(async () => {
    setBiometricTried(true);
    const available = await isBiometricsAvailable();
    if (!available) return;
    const success = await promptBiometricUnlock();
    if (success) onSuccess();
  }, [onSuccess]);

  useEffect(() => {
    if (mode === 'unlock' && biometricEnabled && !biometricTried) {
      tryBiometric();
    }
  }, [mode, biometricEnabled, biometricTried, tryBiometric]);

  const reset = () => setDigits('');

  const submitPin = useCallback(
    async (pin: string) => {
      if (mode === 'setup') {
        if (stage === 'enter') {
          setFirstPin(pin);
          setStage('confirm');
          reset();
          return;
        }
        if (pin !== firstPin) {
          setError('PINs did not match. Try again.');
          setStage('enter');
          setFirstPin('');
          reset();
          return;
        }
        await setPin(pin);
        onSuccess();
        return;
      }

      const exists = await hasPin();
      if (!exists) {
        // No PIN configured yet but lock is enabled somehow -- treat as setup.
        await setPin(pin);
        onSuccess();
        return;
      }
      const ok = await verifyPin(pin);
      if (ok) {
        onSuccess();
      } else {
        setError('Incorrect PIN');
        reset();
      }
    },
    [mode, stage, firstPin, onSuccess]
  );

  const onPressKey = (key: string) => {
    if (key === '') return;
    setError('');
    if (key === 'del') {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    if (digits.length >= PIN_LENGTH) return;
    const next = digits + key;
    setDigits(next);
    if (next.length === PIN_LENGTH) {
      submitPin(next);
    }
  };

  const title = mode === 'setup' ? (stage === 'enter' ? 'Create a PIN' : 'Confirm your PIN') : 'Enter your PIN';
  const subtitle =
    mode === 'setup'
      ? 'Used to unlock MoneyFlow AI if biometrics are unavailable.'
      : 'Your data stays encrypted until you unlock it.';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>

        <View style={styles.dotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  borderColor: theme.colors.borderStrong,
                  backgroundColor: i < digits.length ? theme.colors.accent : 'transparent'
                }
              ]}
            />
          ))}
        </View>

        {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}

        <View style={styles.keypad}>
          {KEYPAD_ROWS.map((row, ri) => (
            <View key={ri} style={styles.keypadRow}>
              {row.map((key, ki) => (
                <TouchableOpacity
                  key={ki}
                  disabled={key === ''}
                  activeOpacity={0.6}
                  onPress={() => onPressKey(key)}
                  style={[
                    styles.key,
                    { backgroundColor: key === '' ? 'transparent' : theme.colors.surfaceAlt, borderColor: theme.colors.border }
                  ]}
                >
                  <Text style={[styles.keyLabel, { color: theme.colors.textPrimary }]}>
                    {key === 'del' ? '⌫' : key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {mode === 'unlock' && biometricEnabled ? (
          <TouchableOpacity onPress={tryBiometric} style={styles.biometricButton}>
            <Text style={[styles.biometricLabel, { color: theme.colors.accent }]}>Use biometrics instead</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, textAlign: 'center', marginBottom: 32 },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  error: { fontSize: 13, marginBottom: 16 },
  keypad: { marginTop: 16, gap: 16 },
  keypadRow: { flexDirection: 'row', gap: 20 },
  key: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  keyLabel: { fontSize: 22, fontWeight: '600' },
  biometricButton: { marginTop: 28 },
  biometricLabel: { fontSize: 14, fontWeight: '600' }
});
