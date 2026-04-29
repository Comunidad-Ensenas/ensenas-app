import { useTheme } from '@/hooks/useTheme';
import React, { ReactNode } from 'react';
import { Pressable, PressableProps, StyleSheet } from 'react-native';

interface IconButtonProps extends PressableProps {
  icon: ReactNode;
  size?: number;
  backgroundColor?: string;
}

export function IconButton({
  icon,
  size = 48,
  backgroundColor,
  style,
  ...rest
}: IconButtonProps) {
  const { isDark } = useTheme();
  
  const defaultBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

  return (
    <Pressable
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor || defaultBg,
        },
        style as any,
      ]}
      {...rest}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});