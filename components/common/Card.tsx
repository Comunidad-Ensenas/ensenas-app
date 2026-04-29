import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'surface' | 'contrast';
  backgroundColor?: string;
}

export function Card({
  variant = 'surface',
  backgroundColor,
  style,
  children,
  ...rest
}: CardProps) {
  const { colors } = useTheme();
  const contrastBg = (colors as any).contrastCard;

  const getBgColor = () => {
    if (backgroundColor) return backgroundColor;
    return variant === 'contrast' ? contrastBg : colors.surface;
  };

  return (
    <View
      style={[
        styles.card,
        styles.softShadow,
        { backgroundColor: getBgColor() },
        style
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 0,
    overflow: 'visible', 
  },
  softShadow: {
    shadowColor: '#444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
});