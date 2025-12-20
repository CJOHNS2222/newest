/*
import { onRequest } from "firebase-functions/https";
import * as admin from 'firebase-admin';
import {
  Client,
  SubscriptionsController
} from '@paypal/paypal-server-sdk';

admin.initializeApp();

// PayPal environment setup
let paypalClient: Client;

if (process.env.PAYPAL_ENVIRONMENT === 'sandbox') {
  paypalClient = new Client({
    clientId: process.env.PAYPAL_CLIENT_ID!,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    environment: 'sandbox'
  } as any);
} else {
  paypalClient = new Client({
    clientId: process.env.PAYPAL_CLIENT_ID!,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    environment: 'production'
  } as any);
}

// PayPal subscription creation
export const createPayPalSubscription = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    // Get the authenticated user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const { planId, amount } = req.body;

    if (!planId || !amount) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const subscriptionsController = new SubscriptionsController(paypalClient);

    // Create subscription request
    const subscriptionRequest = {
      planId: getPayPalPlanId(planId),
      subscriber: {
        emailAddress: decodedToken.email,
        name: {
          givenName: decodedToken.name || 'User',
          surname: decodedToken.name ? decodedToken.name.split(' ').slice(-1)[0] : 'User'
        }
      },
      applicationContext: {
        brandName: 'Smart Pantry Chef',
        locale: 'en-US',
        shippingPreference: 'NO_SHIPPING',
        userAction: 'SUBSCRIBE_NOW',
        paymentMethod: {
          payerSelected: 'PAYPAL',
          payeePreferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        returnUrl: `${process.env.APP_URL || 'http://localhost:5173'}/settings`,
        cancelUrl: `${process.env.APP_URL || 'http://localhost:5173'}/settings`
      }
    };

    const { result } = await subscriptionsController.createSubscription(subscriptionRequest);
    const subscription = result;

    // Store pending subscription in Firestore
    await admin.firestore().collection('users').doc(userId).update({
      pendingPayPalSubscription: {
        id: subscription.id,
        planId: planId,
        amount: amount,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    });

    const approvalUrl = subscription.links?.find((link: any) => link.rel === 'approve')?.href;

    res.json({
      subscriptionId: subscription.id,
      approvalUrl: approvalUrl
    });

  } catch (error) {
    console.error('PayPal subscription creation error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// PayPal subscription approval
export const approvePayPalSubscription = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    // Get the authenticated user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const { subscriptionId, planId } = req.body;

    if (!subscriptionId || !planId) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const subscriptionsController = new SubscriptionsController(paypalClient);

    // Get subscription details from PayPal
    const { result } = await subscriptionsController.getSubscription({ id: subscriptionId });
    const subscription = result;

    if (subscription.status === 'ACTIVE') {
      // Update user subscription in Firestore
      await admin.firestore().collection('users').doc(userId).update({
        subscription: {
          id: subscription.id,
          status: 'active',
          tier: planId,
          provider: 'paypal',
          currentPeriodStart: subscription.startTime ? new Date(subscription.startTime).getTime() / 1000 : Date.now() / 1000,
          currentPeriodEnd: subscription.billingInfo?.nextBillingTime ? new Date(subscription.billingInfo.nextBillingTime).getTime() / 1000 : Date.now() / 1000 + 30 * 24 * 60 * 60,
          cancelAtPeriodEnd: false,
        },
        pendingPayPalSubscription: admin.firestore.FieldValue.delete()
      });

      res.json({
        subscriptionId: subscription.id,
        status: 'active'
      });
    } else {
      res.status(400).json({ error: 'Subscription not active' });
    }

  } catch (error) {
    console.error('PayPal subscription approval error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Helper function to map plan IDs to PayPal plan IDs
function getPayPalPlanId(planId: string): string {
  const planMap: { [key: string]: string } = {
    'premium': process.env.PAYPAL_PREMIUM_PLAN_ID!,
    'family': process.env.PAYPAL_FAMILY_PLAN_ID!,
  };
  return planMap[planId];
}
*/