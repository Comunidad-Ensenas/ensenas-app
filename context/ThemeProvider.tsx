import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

export const AppThemeContext = createContext<any>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ColorSchemeName>(Appearance.getColorScheme() || 'light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@app_theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setTheme(savedTheme);
          Appearance.setColorScheme(savedTheme);
        }
      } catch (error) {
        console.error("Error cargando el tema:", error);
      } finally {
        setIsReady(true);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    Appearance.setColorScheme(newTheme);
    
    try {
      await AsyncStorage.setItem('@app_theme', newTheme);
    } catch (error) {
      console.error("Error guardando el tema:", error);
    }
  };

  // if (!isReady) return null;

  const isDark = theme === 'dark';
  const currentColors = isDark ? Colors.dark : Colors.light;

  return (
    <AppThemeContext.Provider value={{ colors: currentColors, isDark, toggleTheme }}>
      {children}
    </AppThemeContext.Provider>
  );
}