import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { SubscriptionManager } from './SubscriptionManager';

const defaultSettings = {
  notifications: {
    enabled: true,
    time: '09:00',
    types: {
      shoppingList: true,
      mealPlan: true,
    },
  },
  theme: {
    mode: 'dark',
    accentColor: '#4CAF50',
  },
};

interface SettingsProps {
  settings: typeof defaultSettings;
  setSettings: React.Dispatch<React.SetStateAction<typeof defaultSettings>>;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, setSettings, user, onLogout }) => {
  // ...existing code...
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState(settings.notifications);
  const [notifChanged, setNotifChanged] = useState(false);

  const handleChange = (field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        ...value,
      },
    }));
    setNotifChanged(true);
  };

    const handleThemeChange = (key: string, value: any) => {
      setSettings(prev => ({
        ...prev,
        theme: {
          ...prev.theme,
          [key]: value
        }
      }));
    };
  const handleNotifChange = (key: string, value: any) => {
    setPendingNotifications(prev => ({
      ...prev,
      [key]: typeof value === 'object' ? { ...prev[key], ...value } : value,
    }));
    setNotifChanged(false);
  };

  const confirmNotifChanges = () => {
    setSettings(prev => ({
      ...prev,
      notifications: pendingNotifications
    }));
    setNotifChanged(true);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        text: feedback,
        createdAt: Timestamp.now(),
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || null
        } : null
      });
      alert('Thank you for your feedback!');
      setFeedback('');
    } catch (err) {
      alert('Failed to send feedback. Please try again later.');
    }
    setSending(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <div className="mb-6">
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Notifications</h3>
                  <label className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={pendingNotifications.enabled}
                      onChange={e => handleNotifChange('enabled', e.target.checked)}
                    />
                    <span className="ml-2">Enable daily notifications</span>
                  </label>
                  <div className="mb-2">
                    <label className="block text-xs mb-1">Notification Time</label>
                    <input
                      type="time"
                      value={pendingNotifications.time}
                      onChange={e => handleNotifChange('time', e.target.value)}
                      className="border rounded px-2 py-1"
                    />
                  </div>
                  <label className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      checked={pendingNotifications.types.shoppingList}
                      onChange={e => handleNotifChange('types', { shoppingList: e.target.checked })}
                    />
                    <span className="ml-2">Shopping List</span>
                  </label>
                  <label className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      checked={pendingNotifications.types.mealPlan}
                      onChange={e => handleNotifChange('types', { mealPlan: e.target.checked })}
                    />
                    <span className="ml-2">Meal Plan</span>
                  </label>
                </div>
        <form onSubmit={handleFeedbackSubmit} className="mb-6">
          <label className="block mb-2 font-semibold text-theme-secondary">Send Feedback</label>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Let us know your thoughts..."
            className="w-full p-2 border rounded mb-2 resize-none"
            rows={3}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !feedback.trim()}
            className="bg-[var(--accent-color)] text-white px-4 py-2 rounded font-bold w-full"
          >
            {sending ? 'Sending...' : 'Send Feedback'}
          </button>
        </form>
        {user && onLogout && (
          <div className="mb-6">
            <button
              type="button"
              onClick={onLogout}
              className="mb-4 bg-red-500 text-white px-4 py-2 rounded font-bold w-full"
            >
              Logout
            </button>
            <h3 className="font-semibold mb-2">Theme</h3>
            <label className="block mb-2">
              <span className="mr-2">Mode:</span>
              <select
                value={settings.theme.mode}
                onChange={(e) => handleThemeChange('mode', e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
            <label className="block mb-2">
              <span className="mr-2">Accent Color:</span>
              <input
                type="color"
                value={settings.theme.accentColor}
                onChange={(e) => handleThemeChange('accentColor', e.target.value)}
                className="border rounded px-2 py-1"
              />
            </label>
            <label className="block mb-2">
              <span className="mr-2">Background Color:</span>
              <input
                type="color"
                value={settings.theme.backgroundColor || '#ffffff'}
                onChange={(e) => handleThemeChange('backgroundColor', e.target.value)}
                className="border rounded px-2 py-1"
              />
            </label>
          </div>
        )}
        {user && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Subscription</h3>
            <SubscriptionManager />
          </div>
        )}
        <button
          type="button"
          onClick={confirmNotifChanges}
          className="mt-3 bg-[var(--accent-color)] text-white px-4 py-2 rounded font-bold w-full"
        >
          Confirm Notification Changes
        </button>
        {notifChanged && (
          <div className="mt-2 text-green-600 font-bold text-center animate-fade-in">
            Settings have been changed
          </div>
        )}
      </div>
    </div>
  );
};
