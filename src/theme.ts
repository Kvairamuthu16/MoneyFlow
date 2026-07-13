export type ThemeMode = 'light' | 'dark';

const palette = {
  zinc50: '#fafafa',
  zinc100: '#f4f4f5',
  zinc200: '#e4e4e7',
  zinc300: '#d4d4d8',
  zinc400: '#a1a1aa',
  zinc500: '#71717a',
  zinc600: '#52525b',
  zinc700: '#3f3f46',
  zinc800: '#27272a',
  zinc850: '#202023',
  zinc900: '#18181b',
  zinc950: '#09090b',
  white: '#ffffff',

  indigo300: '#a5b4fc',
  indigo400: '#818cf8',
  indigo500: '#6366f1',
  indigo600: '#4f46e5',
  indigo700: '#4338ca',

  emerald300: '#6ee7b7',
  emerald400: '#34d399',
  emerald500: '#10b981',

  rose300: '#fda4af',
  rose400: '#fb7185',
  rose500: '#f43f5e',
  rose600: '#e11d48',

  amber400: '#fbbf24',
  amber500: '#f59e0b',

  sky400: '#38bdf8',
  violet400: '#a78bfa',
  pink400: '#f472b6'
};

export interface AppTheme {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    borderStrong: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentMuted: string;
    success: string;
    warning: string;
    danger: string;
    onAccent: string;
  };
  gradients: {
    hero: string[];
    success: string[];
    danger: string[];
    card: string[];
  };
  chartPalette: string[];
  spacing: (multiplier: number) => number;
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  shadow: {
    card: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

const spacingUnit = 4;

const darkTheme: AppTheme = {
  mode: 'dark',
  colors: {
    background: palette.zinc950,
    surface: palette.zinc900,
    surfaceAlt: palette.zinc850,
    border: palette.zinc800,
    borderStrong: palette.zinc700,
    textPrimary: palette.white,
    textSecondary: palette.zinc300,
    textMuted: palette.zinc500,
    accent: palette.indigo400,
    accentMuted: 'rgba(129, 140, 248, 0.15)',
    success: palette.emerald400,
    warning: palette.amber500,
    danger: palette.rose500,
    onAccent: palette.white
  },
  gradients: {
    hero: [palette.indigo700, palette.indigo600, palette.indigo500],
    success: ['#065f46', palette.emerald500],
    danger: ['#881337', palette.rose500],
    card: [palette.zinc900, palette.zinc850]
  },
  chartPalette: [
    palette.indigo400,
    palette.emerald400,
    palette.amber400,
    palette.rose400,
    palette.sky400,
    palette.violet400,
    palette.pink400
  ],
  spacing: (multiplier: number) => spacingUnit * multiplier,
  radius: { sm: 8, md: 16, lg: 24, xl: 32, full: 9999 },
  shadow: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8
    }
  }
};

const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    background: palette.zinc100,
    surface: palette.white,
    surfaceAlt: palette.zinc50,
    border: palette.zinc200,
    borderStrong: palette.zinc300,
    textPrimary: palette.zinc900,
    textSecondary: palette.zinc700,
    textMuted: palette.zinc500,
    accent: palette.indigo600,
    accentMuted: 'rgba(79, 70, 229, 0.1)',
    success: '#059669',
    warning: '#d97706',
    danger: '#e11d48',
    onAccent: palette.white
  },
  gradients: {
    hero: [palette.indigo600, palette.indigo500, palette.indigo400],
    success: ['#059669', palette.emerald400],
    danger: [palette.rose600, palette.rose400],
    card: [palette.white, palette.zinc50]
  },
  chartPalette: [
    palette.indigo500,
    '#059669',
    palette.amber500,
    palette.rose500,
    '#0284c7',
    '#7c3aed',
    '#db2777'
  ],
  spacing: (multiplier: number) => spacingUnit * multiplier,
  radius: { sm: 8, md: 16, lg: 24, xl: 32, full: 9999 },
  shadow: {
    card: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3
    }
  }
};

export const themes: Record<ThemeMode, AppTheme> = {
  dark: darkTheme,
  light: lightTheme
};

export function getTheme(mode: ThemeMode): AppTheme {
  return themes[mode];
}

// Breakpoint helper for responsive layouts (phone vs tablet).
export const breakpoints = {
  tablet: 768
};

export function isTabletWidth(width: number): boolean {
  return width >= breakpoints.tablet;
}
