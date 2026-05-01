import { CustomTabBar } from '@/components/navigation/CustomTabBar';
import { Tabs } from 'expo-router';
import { BookStack, ChatBubble, PeaceHand, ShareAndroid, VideoCamera } from 'iconoir-react-native';
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
          title: 'Formas',
          tabBarIcon: ({ color }) => <PeaceHand width={24} height={24} color={color} strokeWidth={2} />
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Señas',
          tabBarIcon: ({ color }) => <VideoCamera width={24} height={24} color={color} strokeWidth={2} />
        }}
      />
      <Tabs.Screen
        name="phrases"
        options={{
          title: 'Frases',
          tabBarIcon: ({ color }) => <ChatBubble width={24} height={24} color={color} strokeWidth={2} />
        }}
      />
      <Tabs.Screen 
        name="modules" 
        options={{ 
          title: 'Módulos',
          tabBarIcon: ({ color }) => <BookStack width={24} height={24} color={color} strokeWidth={2} />
        }} 
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Compartir',
          tabBarIcon: ({ color }) => <ShareAndroid width={24} height={24} color={color} strokeWidth={2} />
        }}
      />
    </Tabs>
  );
}