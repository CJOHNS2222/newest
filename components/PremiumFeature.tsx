import React from 'react';
import { Lock, Crown } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { User } from '../types';

interface PremiumFeatureProps {
  children: React.ReactNode;
  feature: string;
  user: User | null;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
  limit?: number;
  currentCount?: number;
  fallbackMessage?: string;
  onUpgrade?: () => void;
}

export const PremiumFeature: React.FC<PremiumFeatureProps> = ({
  children,
  feature,
  user,
  fallback,
  showUpgrade = true,
  limit,
  currentCount,
  fallbackMessage,
  onUpgrade
}) => {
  const { isPremium, isActive, loading } = useSubscription(user);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-8 rounded"></div>;
  }

  // If no user is logged in, don't apply premium restrictions
  if (!user) {
    return <>{children}</>;
  }

  // Check if user has reached the limit for free tier
  const hasReachedLimit = limit && currentCount && currentCount >= limit;

  if (isPremium && isActive) {
    return <>{children}</>;
  }

  // If there's a limit and user has reached it, show limit message
  if (hasReachedLimit && !isPremium) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showUpgrade) {
      return null;
    }

    return (
      <div className="premium-overlay-container">
        <div className="premium-overlay-backdrop">
          <div className="premium-upgrade-modal">
            <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <h3 className="font-bold text-gray-900 mb-1">Limit Reached</h3>
            <p className="text-sm text-gray-600 mb-3">
              {fallbackMessage || `You've reached the ${limit} ${feature} limit. Upgrade to unlock unlimited access.`}
            </p>
            <button className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:from-yellow-500 hover:to-orange-600 transition-all" onClick={onUpgrade || (() => alert('Upgrade functionality would navigate to subscription manager'))}>
              Upgrade Now
            </button>
          </div>
        </div>
        <div className="opacity-30 pointer-events-none">
          {children}
        </div>
      </div>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgrade) {
    return null;
  }

  return (
    <div className="premium-overlay-container">
      <div className="premium-overlay-backdrop">
        <div className="premium-upgrade-modal">
          <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <h3 className="font-bold text-gray-900 mb-1">Premium Feature</h3>
          <p className="text-sm text-gray-600 mb-3">
            Upgrade to unlock {feature}
          </p>
          <button className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:from-yellow-500 hover:to-orange-600 transition-all" onClick={onUpgrade || (() => alert('Upgrade functionality would navigate to subscription manager'))}>
            Upgrade Now
          </button>
        </div>
      </div>
      <div className="opacity-30 pointer-events-none">
        {children}
      </div>
    </div>
  );
};

interface FeatureLimitProps {
  current: number;
  limit: number;
  feature: string;
  user: User | null;
  children: React.ReactNode;
}

export const FeatureLimit: React.FC<FeatureLimitProps> = ({
  current,
  limit,
  feature,
  user,
  children
}) => {
  const { isPremium, isActive } = useSubscription(user);

  if (isPremium && isActive) {
    return <>{children}</>;
  }

  if (current >= limit) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <Lock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
        <p className="text-sm text-yellow-800 mb-2">
          You've reached the free limit of {limit} {feature}
        </p>
        <button className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 transition-colors">
          Upgrade for Unlimited
        </button>
      </div>
    );
  }

  return <>{children}</>;
};