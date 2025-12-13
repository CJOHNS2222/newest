import { useState } from 'react';

export function useToasts() {
  const [toasts, setToasts] = useState<Array<{
    id: number;
    message: string;
    type?: 'error' | 'info';
    actionLabel?: string;
    action?: () => void
  }>>([]);

  const addToast = (message: string, type: 'error' | 'info' = 'error', ttl = 4000, actionLabel?: string, action?: () => void) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [{ id, message, type, actionLabel, action }, ...prev]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ttl);
  };

  return { toasts, setToasts, addToast };
}