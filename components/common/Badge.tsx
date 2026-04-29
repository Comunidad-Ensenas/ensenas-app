import React, { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';

interface BadgeProps extends ViewProps {
  text: string;
  icon?: ReactNode;
  backgroundColor: string;
  textColor: string;
}

export function Badge({
  text,
  icon,
  backgroundColor,
  textColor,
  style,
  ...rest
}: BadgeProps) {
  return (
    <View style={[styles.container, { backgroundColor }, style]} {...rest}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.text, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  iconContainer: {
    marginRight: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
});