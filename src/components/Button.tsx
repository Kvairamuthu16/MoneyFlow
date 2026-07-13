import React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

/** Minimum comfortable touch target per accessibility guidance (44x44pt). */
const MIN_HIT_HEIGHT = 44;

export function Button({ label, variant = 'primary', loading, disabled, style, icon, ...rest }: ButtonProps) {
  const theme = useTheme();

  const backgroundByVariant: Record<ButtonVariant, string> = {
    primary: theme.colors.accent,
    secondary: theme.colors.surfaceAlt,
    ghost: 'transparent',
    danger: theme.colors.danger
  };

  const textColorByVariant: Record<ButtonVariant, string> = {
    primary: theme.colors.onAccent,
    secondary: theme.colors.textPrimary,
    ghost: theme.colors.accent,
    danger: theme.colors.onAccent
  };

  const borderByVariant: Record<ButtonVariant, string | undefined> = {
    primary: undefined,
    secondary: theme.colors.border,
    ghost: theme.colors.border,
    danger: undefined
  };

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        {
          minHeight: MIN_HIT_HEIGHT,
          paddingHorizontal: theme.spacing(5),
          borderRadius: theme.radius.md,
          backgroundColor: backgroundByVariant[variant],
          borderWidth: borderByVariant[variant] ? 1 : 0,
          borderColor: borderByVariant[variant],
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          opacity: disabled ? 0.5 : 1,
          gap: 8
        },
        style
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColorByVariant[variant]} />
      ) : (
        <>
          {icon}
          <Text style={{ color: textColorByVariant[variant], fontWeight: '700', fontSize: 13 }}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
