import { UserProvider } from '@/hooks/useUserData';
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <UserProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="feedback" />
      </Stack>
    </UserProvider>
  );
}