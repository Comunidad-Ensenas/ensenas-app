import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface Props {
  progress: number;
  color?: string;
  style?: ViewStyle;
  height?: number;
}

export function ProgressBar({ progress, color, style, height = 8 }: Props) {
  const { colors } = useTheme();
  const activeColor = color || colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, height }, style]}>
      <View 
        style={[
          styles.fill, 
          { 
            width: `${Math.min(Math.max(progress, 0), 1) * 100}%`, 
            backgroundColor: activeColor 
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
});