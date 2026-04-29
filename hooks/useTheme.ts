import { AppThemeContext } from '@/context/ThemeProvider';
import { useContext } from 'react';

export function useTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useTheme debe ser usado dentro de AppThemeProvider');
  }

  return context;
}