import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  icon: React.ReactNode;
  label: string;
  isFocused: boolean;
  onPress: () => void;
}

export function TabBarItem({ icon, label, isFocused, onPress }: Props) {
  const { colors } = useTheme();
  const palette = (colors as any).palette;

  const activeColor = palette.deepSkyBlue;
  const inactiveColor = colors.textSecondary;

  return (
    <Pressable onPress={onPress} style={styles.tabItem}>
      <View 
        style={[
          styles.indicator, 
          { 
            backgroundColor: isFocused ? activeColor : 'transparent',
            shadowColor: activeColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isFocused ? 0.4 : 0,
            shadowRadius: 4,
            elevation: isFocused ? 2 : 0,
          }
        ]} 
      />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color: isFocused ? activeColor : inactiveColor,
              fontWeight: isFocused ? '800' : '600',
              opacity: isFocused ? 1 : 0.7,
            }
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  indicator: {
    width: 20,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    top: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  iconContainer: {
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
});