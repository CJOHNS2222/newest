import { onRequest } from "firebase-functions/https";
import * as admin from 'firebase-admin';
import * as stripe from 'stripe';

// Ensure the Admin SDK is initialized
if (!admin.apps?.length) {
  admin.initializeApp();
}

// Lazy initialize Stripe client
function getStripeClient(): stripe.Stripe {
  return new stripe.Stripe(process.env.STRIPE_SECRET_KEY!);
}

// Stripe subscription creation
export const createSubscription = onRequest(async (req, res) => {
  const stripeClient = getStripeClient();
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const { paymentMethodId, planId } = req.body;

    if (!paymentMethodId || !planId) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Map plan IDs to Stripe price IDs (you'll need to create these in Stripe)
    const priceMap: { [key: string]: string } = {
      'premium': process.env.STRIPE_PREMIUM_PRICE_ID!,
      'family': process.env.STRIPE_FAMILY_PRICE_ID!,
    };

    const priceId = priceMap[planId];
    if (!priceId) {
      res.status(400).json({ error: 'Invalid plan ID' });
      return;
    }

    // Get the authenticated user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Create or retrieve customer
    let customer;
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData?.stripeCustomerId) {
      customer = await stripeClient.customers.retrieve(userData.stripeCustomerId);
    } else {
      customer = await stripeClient.customers.create({
        email: decodedToken.email,
        metadata: { firebaseUID: userId }
      });

      // Update user document with Stripe customer ID
      await admin.firestore().collection('users').doc(userId).update({
        stripeCustomerId: customer.id
      });
    }

    // Attach payment method to customer
    await stripeClient.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // Set as default payment method
    await stripeClient.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription
    const subscription = await stripeClient.subscriptions.create({
      customer: customer.id,
      items: [{
        price: priceId,
      }],
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        firebaseUID: userId,
        planId: planId,
      },
    });

    // Update user subscription in Firestore
    await admin.firestore().collection('users').doc(userId).update({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        tier: planId,
        currentPeriodStart: (subscription as any).current_period_start,
        currentPeriodEnd: (subscription as any).current_period_end,
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      }
    });

    const latestInvoice = (subscription as any).latest_invoice;
    const clientSecret = (latestInvoice && typeof latestInvoice !== 'string' && latestInvoice.payment_intent && typeof latestInvoice.payment_intent !== 'string')
      ? latestInvoice.payment_intent.client_secret
      : null;

    res.json({
      subscriptionId: subscription.id,
      clientSecret: clientSecret,
      status: subscription.status,
    });

  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});