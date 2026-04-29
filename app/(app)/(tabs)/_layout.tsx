import { CustomTabBar } from '@/components/navigation/CustomTabBar';
import { UserProvider } from '@/hooks/useUserData';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <UserProvider>
      <Tabs
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
        <Tabs.Screen name="practice" options={{ title: 'Práctica' }} />
        <Tabs.Screen name="dictionary" options={{ title: 'Diccionario' }} />
        <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
      </Tabs>
    </UserProvider>
  );
}