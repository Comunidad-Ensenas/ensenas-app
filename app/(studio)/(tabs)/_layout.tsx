import { CustomTabBar } from '@/components/navigation/CustomTabBar';
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function StudioTabsLayout() {
  return (
    <Tabs 
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ 
        headerShown: false, 
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Configuraciones',
          tabBarIcon: ({ color }) => <MaterialIcons name="pan-tool" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="capture" 
        options={{ 
          title: 'Señas',
          tabBarIcon: ({ color }) => <MaterialIcons name="videocam" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="export" 
        options={{ 
          title: 'Compartir',
          tabBarIcon: ({ color }) => <MaterialIcons name="share" size={24} color={color} />
        }} 
      />
    </Tabs>
  );
}