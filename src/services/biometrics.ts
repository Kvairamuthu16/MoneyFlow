import ReactNativeBiometrics from 'react-native-biometrics';

export async function isBiometricsAvailable(): Promise<boolean> {
  const { available } = await ReactNativeBiometrics.isSensorAvailable();
  return available;
}

/** Prompts the user for biometric auth. Resolves false on cancel, rejects only on hardware error. */
export async function promptBiometricUnlock(promptMessage = 'Unlock MoneyFlow AI'): Promise<boolean> {
  try {
    const { success } = await ReactNativeBiometrics.simplePrompt({ promptMessage, cancelButtonText: 'Use PIN' });
    return success;
  } catch {
    return false;
  }
}
