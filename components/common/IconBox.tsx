import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

interface IconBoxProps extends ViewProps {
  icon: ReactNode;
  size?: number;
  backgroundColor: string;
  borderRadius?: number;
}

export function IconBox({ icon, size = 48, backgroundColor, borderRadius, style, ...rest }: IconBoxProps) {
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: borderRadius ?? size / 2, backgroundColor },
        style
      ]}
      {...rest}
    >
      {icon}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
});