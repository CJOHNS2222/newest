import React, { useState } from 'react';

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

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [feedback, setFeedback] = useState('');

  const handleChange = (field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        ...value,
      },
    }));
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Send feedback to backend or email
    alert('Thank you for your feedback!');
    setFeedback('');
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Notifications</h3>
        <label className="flex items-center mb-2">
          <input
            type="checkbox"
            checked={settings.notifications.enabled}
            onChange={(e) => handleChange('notifications', { enabled: e.target.checked })}
          />
          <span className="ml-2">Enable daily notifications</span>
        </label>
        <div className="mb-2">
          <label className="block text-xs mb-1">Notification Time</label>
          <input
            type="time"
            value={settings.notifications.time}
            onChange={(e) => handleChange('notifications', { time: e.target.value })}
            className="border rounded px-2 py-1"
          />
        </div>
        <label className="flex items-center mb-1">
          <input
            type="checkbox"
            checked={settings.notifications.types.shoppingList}
            onChange={(e) => handleChange('notifications', { types: { ...settings.notifications.types, shoppingList: e.target.checked } })}
          />
          <span className="ml-2">Shopping List</span>
        </label>
        <label className="flex items-center mb-1">
          <input
            type="checkbox"
            checked={settings.notifications.types.mealPlan}
            onChange={(e) => handleChange('notifications', { types: { ...settings.notifications.types, mealPlan: e.target.checked } })}
          />
          <span className="ml-2">Meal Plan</span>
        </label>
      </div>
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Theme</h3>
        <label className="block mb-2">
          <span className="mr-2">Mode:</span>
          <select
            value={settings.theme.mode}
            onChange={(e) => handleChange('theme', { mode: e.target.value })}
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
            onChange={(e) => handleChange('theme', { accentColor: e.target.value })}
            className="border rounded px-2 py-1"
          />
        </label>
      </div>
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Feedback</h3>
        <form onSubmit={handleFeedbackSubmit}>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your ideas or report bugs..."
            className="w-full border rounded px-2 py-1 mb-2"
            rows={3}
          />
          <button type="submit" className="bg-amber-500 text-white px-4 py-2 rounded">Send Feedback</button>
        </form>
      </div>
    </div>
  );
};
