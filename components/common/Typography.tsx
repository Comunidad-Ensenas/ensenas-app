import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'subtitle' | 'body' | 'label';
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function Typography({
  variant = 'body',
  color,
  align = 'auto',
  style,
  children,
  ...rest
}: TypographyProps) {
  const { colors } = useTheme();

  const textStyles = [
    styles[variant],
    { color: color || colors.text, textAlign: align },
    style,
  ];

  return (
    <Text style={textStyles} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  h3: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '700' },
});