import { AppThemeProvider } from '@/context/ThemeProvider';
import { db } from '@/db';
import { profile } from '@/db/schema';
import migrations from '@/drizzle/migrations';
import { useTheme } from '@/hooks/useTheme';
import { useStudioStore } from '@/store/useStudioStore';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack, router, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: process.env.EXPO_PUBLIC_APP_MODE === 'studio' ? '(studio)' : '(app)',
};

SplashScreen.preventAutoHideAsync();

// expo-gl cannot provide these WebGL features and @react-three/fiber still uses the deprecated
// THREE.Clock, so every canvas logs warnings the app cannot act on. Keep them out of the dev console.
if (__DEV__) {
  const ignoredLogs = [
    'EXGL: gl.pixelStorei()',
    'THREE.Clock: This module has been deprecated',
    'THREE.WebGLRenderer: WEBGL_lose_context extension not supported',
  ];
  for (const level of ['log', 'warn'] as const) {
    const original = console[level];
    console[level] = (first: unknown, ...rest: unknown[]) => {
      if (typeof first === 'string' && ignoredLogs.some((ignored) => first.includes(ignored))) return;
      original(first, ...rest);
    };
  }
}

function RootLayoutNav() {
  const { isDark } = useTheme();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      {/* Screens are auto-discovered: naming the inactive group here warns in the other app mode. */}
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  const { success: migrationsSuccess, error: migrationError } = useMigrations(db, migrations);
  const [isRoutingReady, setIsRoutingReady] = useState(false);
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (!migrationsSuccess || !navigationState?.key) return;

    const routeApp = async () => {
      try {
        const appMode = process.env.EXPO_PUBLIC_APP_MODE;

        if (appMode === 'studio') {
          await useStudioStore.getState().loadAllData();
          router.replace('/(studio)/(tabs)');
          return;
        }

        const users = await db.select().from(profile).limit(1);
        if (users.length === 0) {
          router.replace('/(app)/onboarding');
        } else {
          router.replace('/(app)/(tabs)');
        }
      } catch (err) {
      } finally {
        setIsRoutingReady(true);
      }
    };

    routeApp();
  }, [migrationsSuccess, navigationState?.key]);

  useEffect(() => {
    if (fontsLoaded && migrationsSuccess && isRoutingReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, migrationsSuccess, isRoutingReady]);

  if (migrationError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{migrationError.message}</Text>
      </View>
    );
  }

  if (!fontsLoaded || !migrationsSuccess || !isRoutingReady) {
    return null;
  }

  return (
    <AppThemeProvider>
      <RootLayoutNav />
    </AppThemeProvider>
  );
}