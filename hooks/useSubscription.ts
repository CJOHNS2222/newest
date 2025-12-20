import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, Subscription } from '../types';

export function useSubscription(user: User | null) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.id), (doc) => {
      const data = doc.data();
      if (data?.subscription) {
        setSubscription(data.subscription);
      } else {
        // Default to premium tier for development/testing
        setSubscription({
          tier: 'premium',
          status: 'active',
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          cancel_at_period_end: false
        });
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.id]);

  const updateSubscription = async (updates: Partial<Subscription>) => {
    if (!user?.id) return;

    try {
      await updateDoc(doc(db, 'users', user.id), {
        subscription: { ...subscription, ...updates }
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  };

  const isPremium = subscription?.tier === 'premium' || subscription?.tier === 'family';
  const isFamily = subscription?.tier === 'family';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  return {
    subscription,
    loading,
    updateSubscription,
    isPremium,
    isFamily,
    isActive
  };
}