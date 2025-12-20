import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { CreditCard } from 'lucide-react';

interface PayPalCheckoutProps {
  planId: string;
  planName: string;
  planPrice: string;
  onSuccess: (subscriptionId: string) => void;
  onCancel: () => void;
}

export const PayPalCheckout: React.FC<PayPalCheckoutProps> = ({
  planId,
  planName,
  planPrice,
  onSuccess,
  onCancel
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Convert price string to number (remove $ and convert to cents for PayPal)
  const priceValue = parseFloat(planPrice.replace('$', ''));
  const paypalAmount = priceValue.toFixed(2);

  const createSubscription = async (data: any, actions: any) => {
    try {
      const functions = getFunctions();
      const createPayPalSubscription = httpsCallable(functions, 'createPayPalSubscription');

      const result = await createPayPalSubscription({
        planId,
        planName,
        amount: paypalAmount
      });

      const subscriptionData = result.data as { subscriptionId: string };
      return subscriptionData.subscriptionId;
    } catch (error) {
      console.error('Error creating PayPal subscription:', error);
      throw error;
    }
  };

  const onApprove = async (data: any, actions: any) => {
    setIsProcessing(true);
    try {
      const functions = getFunctions();
      const approvePayPalSubscription = httpsCallable(functions, 'approvePayPalSubscription');

      const result = await approvePayPalSubscription({
        subscriptionId: data.subscriptionID,
        planId,
        planName
      });

      const approvalData = result.data as { subscriptionId: string };
      onSuccess(approvalData.subscriptionId);
    } catch (error) {
      console.error('Error approving PayPal subscription:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

  if (!paypalClientId) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200 text-sm">
          PayPal is not configured. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <CreditCard className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Complete Payment with PayPal
        </h3>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You're subscribing to <strong>{planName}</strong> for <strong>{planPrice}/month</strong>
        </p>
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Processing payment...</span>
        </div>
      )}

      <PayPalScriptProvider
        options={{
          'client-id': paypalClientId,
          currency: 'USD',
          intent: 'subscription',
          vault: true,
          'enable-funding': 'paypal',
          'disable-funding': 'card'
        }}
      >
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'subscribe'
          }}
          createSubscription={createSubscription}
          onApprove={onApprove}
          onError={(err) => {
            console.error('PayPal error:', err);
            alert('Payment failed. Please try again.');
          }}
          onCancel={onCancel}
        />
      </PayPalScriptProvider>

      <div className="mt-4 text-center">
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};