import { Typography } from '@/components/common/Typography';
import { useTheme } from '@/hooks/useTheme';
import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewProps } from 'react-native';

interface SectionHeaderProps extends ViewProps {
  title: string | ReactNode;
  actionText?: string;
  onActionPress?: () => void;
  actionColor?: string;
}

export function SectionHeader({ title, actionText, onActionPress, actionColor, style, ...rest }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]} {...rest}>
      <Typography variant="h2">{title}</Typography>
      {actionText && (
        <Pressable onPress={onActionPress}>
          <Typography variant="body" style={{ color: actionColor || colors.primary, fontWeight: '700' }}>
            {actionText}
          </Typography>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
});