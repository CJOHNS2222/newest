import React from 'react';
import { ChefHat, ShoppingBasket, CalendarDays, UtensilsCrossed, Users, Sun } from 'lucide-react';
import { Tab } from '../../types/app';

interface AppNavigationProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export const AppNavigation: React.FC<AppNavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: Tab.PANTRY, icon: ChefHat, label: 'Pantry' },
    { id: Tab.SHOPPING, icon: ShoppingBasket, label: 'Shop' },
    { id: Tab.MEALS, icon: CalendarDays, label: 'Plan' },
    { id: Tab.RECIPES, icon: UtensilsCrossed, label: 'Chef' },
    { id: Tab.COMMUNITY, icon: Users, label: 'Social' },
    { id: Tab.SETTINGS, icon: Sun, label: 'Settings' },
  ];

  return (
    <nav className="bg-theme-secondary border-t border-theme fixed bottom-0 w-full max-w-md pb-safe z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] transition-colors duration-300">
      <div className="flex justify-around items-end pb-2 pt-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${
              activeTab === tab.id ? '-translate-y-1' : 'opacity-60 hover:opacity-100'
            }`}
          >
            <div className={`p-1.5 rounded-full mb-0.5 transition-all ${
              activeTab === tab.id ? 'bg-theme-primary shadow-lg border border-theme' : ''
            }`}>
              <tab.icon className="w-5 h-5" style={{color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)'}} />
            </div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-theme-secondary">
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};