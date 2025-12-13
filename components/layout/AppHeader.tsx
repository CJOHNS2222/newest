import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { User } from '../types';

interface AppHeaderProps {
  user: User;
  settings: any;
  setSettings: (settings: any) => void;
  onShowHousehold: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  settings,
  setSettings,
  onShowHousehold
}) => {
  return (
    <header className="bg-theme-secondary p-4 pt-6 sticky top-0 z-20 shadow-md border-b border-theme transition-colors duration-300">
      <div className="flex justify-between items-center">
        <button
          onClick={onShowHousehold}
          className="flex items-center space-x-2 px-2 py-1 rounded-full hover:bg-black/5 transition-colors"
        >
          {user.avatar ? (
            <img src={user.avatar} className="w-8 h-8 rounded-full border border-theme" alt="profile" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{backgroundColor: 'var(--accent-color)'}}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-serif font-bold text-theme-primary" style={{color: 'var(--accent-color)'}}>
            Smart Pantry Chef
          </h1>
          <span className="text-[10px] uppercase tracking-widest text-theme-secondary opacity-60">AI Kitchen Assistant</span>
        </div>
        <button
          onClick={() => setSettings(prev => ({
            ...prev,
            theme: {
              ...prev.theme,
              mode: prev.theme.mode === 'dark' ? 'light' : 'dark'
            }
          }))}
          className="p-2 text-theme-secondary opacity-70 hover:opacity-100"
        >
          {settings.theme.mode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};