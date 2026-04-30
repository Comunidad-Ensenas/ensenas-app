import { useTheme } from '@/hooks/useTheme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBarItem } from './TabBarItem';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const palette = (colors as any).palette;

  const extraPadding = Platform.OS === 'android' 
    ? (insets.bottom > 24 ? 4 : 8) 
    : 16; 

  const safeBottomPadding = Math.max(insets.bottom + extraPadding, 20);

  return (
    <View 
      style={[
        styles.tabBarContainer, 
        { 
          backgroundColor: isDark ? '#1A1A1A' : colors.surface, 
          paddingTop: 16,
          paddingBottom: safeBottomPadding, 
          shadowColor: isDark ? '#FFFFFF' : '#000000',
          shadowOpacity: isDark ? 0.04 : 0.06,
        }
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const label =
          options.tabBarLabel !== undefined
            ? (options.tabBarLabel as string)
            : options.title !== undefined
            ? options.title
            : route.name;

        const activeColor = isFocused ? palette.deepSkyBlue : colors.textSecondary;

        const renderIcon = options.tabBarIcon;

        return (
          <TabBarItem
            key={route.key}
            icon={renderIcon ? renderIcon({ focused: isFocused, color: activeColor, size: 26 }) : null}
            label={label}
            isFocused={isFocused}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 16,
    elevation: 24,
  },
});