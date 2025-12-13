import { useState, useEffect } from 'react';

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('settings');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      notifications: {
        enabled: true,
        time: '09:00',
        types: { shoppingList: true, mealPlan: true },
      },
      theme: { mode: 'dark', accentColor: '#4CAF50' },
    };
  });

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  return { settings, setSettings };
}