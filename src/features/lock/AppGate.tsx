import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppStorage, initializeStorage } from '../../storage/mmkv';
import { hasPin } from '../../storage/pinAuth';
import { LockScreen } from './LockScreen';

type GatePhase = 'loading' | 'locked' | 'unlocked';

/**
 * Boots encrypted storage before anything reads from it, then optionally
 * gates the app behind the PIN/biometric LockScreen. Renders below
 * AppDataProvider/ThemeProvider on purpose -- those read from storage
 * synchronously on mount, so they can't exist until initializeStorage()
 * has resolved.
 */
export function AppGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<GatePhase>('loading');
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initializeStorage();
      const settings = AppStorage.getSettings();
      const pinExists = await hasPin();
      if (cancelled) return;
      if (settings.biometricLockEnabled && pinExists) {
        setBiometricEnabled(true);
        setPhase('locked');
      } else {
        setPhase('unlocked');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090b' }}>
        <ActivityIndicator color="#818cf8" size="large" />
      </View>
    );
  }

  if (phase === 'locked') {
    return <LockScreen mode="unlock" biometricEnabled={biometricEnabled} onSuccess={() => setPhase('unlocked')} />;
  }

  return <>{children}</>;
}
