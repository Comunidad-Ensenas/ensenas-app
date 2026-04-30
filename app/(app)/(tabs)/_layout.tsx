import { CustomTabBar } from '@/components/navigation/CustomTabBar';
import { UserProvider } from '@/hooks/useUserData';
import { Tabs } from 'expo-router';
import { BookStack, HomeSimple, PeaceHand, ProfileCircle } from 'iconoir-react-native';
import React from 'react';

export default function TabLayout() {
  return (
    <UserProvider>
      <Tabs
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen 
          name="index" 
          options={{ 
            title: 'Inicio',
            tabBarIcon: ({ color }) => <HomeSimple width={26} height={26} color={color} strokeWidth={2.2} />
          }} 
        />
        <Tabs.Screen 
          name="practice" 
          options={{ 
            title: 'Práctica',
            tabBarIcon: ({ color }) => <PeaceHand width={26} height={26} color={color} strokeWidth={2.2} />
          }} 
        />
        <Tabs.Screen 
          name="dictionary" 
          options={{ 
            title: 'Diccionario',
            tabBarIcon: ({ color }) => <BookStack width={26} height={26} color={color} strokeWidth={2.2} />
          }} 
        />
        <Tabs.Screen 
          name="profile" 
          options={{ 
            title: 'Perfil',
            tabBarIcon: ({ color }) => <ProfileCircle width={26} height={26} color={color} strokeWidth={2.2} />
          }} 
        />
      </Tabs>
    </UserProvider>
  );
}