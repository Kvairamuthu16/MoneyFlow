import React from 'react';
import { View, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  bordered?: boolean;
  elevated?: boolean;
}

/** Themed rounded surface used across every screen for consistent cards. */
export function Card({ style, padded = true, bordered = true, elevated = false, children, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: bordered ? 1 : 0,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing(5) : 0
        },
        elevated ? theme.shadow.card : null,
        style
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
