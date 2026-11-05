import { ensureSeeded } from '@/db/seed';
import { UserProvider } from '@/hooks/useUserData';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';

export default function AppLayout() {
  const [seedReady, setSeedReady] = useState(false);

  useEffect(() => {
    ensureSeeded()
      .catch((error) => console.warn('No se pudo cargar el contenido inicial:', error))
      .finally(() => setSeedReady(true));
  }, []);

  if (!seedReady) return null;

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
