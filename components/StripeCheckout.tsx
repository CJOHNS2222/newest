import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Crown, CreditCard, Loader2 } from 'lucide-react';
import stripePromise from '../services/stripeService';
import { auth } from '../firebaseConfig';

interface StripeCheckoutProps {
  planId: string;
  planName: string;
  planPrice: string;
  onSuccess: (subscriptionId: string) => void;
  onCancel: () => void;
}

const CheckoutForm: React.FC<StripeCheckoutProps> = ({ planId, planName, planPrice, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card element not found');
      setLoading(false);
      return;
    }

    try {
      // Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (paymentMethodError) {
        setError(paymentMethodError.message || 'Payment method creation failed');
        setLoading(false);
        return;
      }

      // Get auth token
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();

      // Call your backend to create subscription
      const response = await fetch('https://us-central1-gen-lang-client-0893655267.cloudfunctions.net/createSubscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          planId,
          planName,
          planPrice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Subscription creation failed');
      }

      // Confirm the payment
      const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret);

      if (confirmError) {
        setError(confirmError.message || 'Payment confirmation failed');
        setLoading(false);
        return;
      }

      onSuccess(data.subscriptionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-gray-900">Upgrade to {planName}</h2>
        <p className="text-gray-600">{planPrice}/month</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Card Information
          </label>
          <div className="border border-gray-300 rounded-md p-3">
            <CardElement options={cardStyle} />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Subscribe
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export const StripeCheckout: React.FC<StripeCheckoutProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
};