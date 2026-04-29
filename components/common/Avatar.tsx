import React, { ReactNode } from 'react';
import { Pressable, PressableProps, StyleSheet, Text, View } from 'react-native';

interface AvatarProps extends PressableProps {
  icon: ReactNode;
  size?: number;
  backgroundColor: string;
  badgeText?: string;
  badgeColor?: string;
}

export function Avatar({ icon, size = 52, backgroundColor, badgeText, badgeColor, style, ...rest }: AvatarProps) {
  return (
    <Pressable
      style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor }, style as any]}
      {...rest}
    >
      {icon}
      {badgeText && badgeColor && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  badge: { position: 'absolute', bottom: -6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 0 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});