import { useTheme } from '@/hooks/useTheme';
import React, { ReactNode } from 'react';
import { Pressable, PressableProps, StyleSheet, Text, View } from 'react-native';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: ReactNode;
  color?: string;
  textColor?: string;
}

export function Button({
  title,
  variant = 'primary',
  icon,
  color,
  textColor,
  style,
  ...rest
}: ButtonProps) {
  const { colors, isDark } = useTheme();
  const palette = (colors as any).palette;

  const getBgColor = () => {
    if (color) return color;
    if (variant === 'primary') return palette.powderBlush || colors.primary;
    if (variant === 'secondary') return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    return 'transparent';
  };

  const getTextColor = () => {
    if (textColor) return textColor;
    if (variant === 'primary') return isDark ? '#111418' : '#FFFFFF';
    return colors.text;
  };

  return (
    <Pressable
      style={[
        styles.button,
        { backgroundColor: getBgColor() },
        style as any,
      ]}
      {...rest}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '800',
    fontSize: 14,
  },
  iconContainer: {
    marginRight: 8,
  },
});