import { Stack } from 'expo-router';
import { CameraServerProvider } from '@/context/CameraServerContext';

export default function StudioLayout() {
  return (
    <CameraServerProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </CameraServerProvider>
  );
}