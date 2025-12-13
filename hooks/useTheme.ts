import { useEffect } from 'react';

interface ThemeSettings {
  mode: 'light' | 'dark';
  accentColor: string;
  backgroundColor?: string;
}

export function useTheme(themeSettings: ThemeSettings) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeSettings.mode);
    document.documentElement.style.setProperty('--accent-color', themeSettings.accentColor);
    if (themeSettings.backgroundColor) {
      document.documentElement.style.setProperty('--theme-background', themeSettings.backgroundColor);
    }
  }, [themeSettings]);

  return { theme: themeSettings };
}