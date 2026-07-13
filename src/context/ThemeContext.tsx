import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { AppTheme, ThemeMode, getTheme } from '../theme';
import { useAppData } from './AppDataContext';

const ThemeContext = createContext<AppTheme | undefined>(undefined);

/**
 * Resolves the user's theme preference (light/dark/system) against the OS
 * color scheme and exposes the concrete AppTheme to the component tree.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useAppData();
  const systemScheme = useColorScheme();

  const theme = useMemo(() => {
    const resolvedMode: ThemeMode = settings.theme === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : settings.theme;
    return getTheme(resolvedMode);
  }, [settings.theme, systemScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
