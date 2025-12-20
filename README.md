# Smart Pantry Chef

## Overview
Smart Pantry Chef is a cross-platform pantry and meal management app built with React, Vite, Firebase, and Capacitor. It supports real-time household sharing, notifications, recipe management, and user customization.

## Key Features
- Household inventory, shopping list, meal plan, and saved recipes shared in real-time via Firebase Firestore
- Email/password and Google authentication (with email verification)
- Daily notifications for shopping list and meal plan (customizable in settings)
- Theme customization (dark/light, accent color)
- Feedback form for user ideas and bug reports
- Recipe sharing between households
- Firebase Analytics for usage tracking
- **Subscription system with Stripe payment processing**
  - Free tier: Basic features with limits
  - Premium tier: Unlimited recipes, meal plans, and household members

## Subscription System
The app includes a subscription-based monetization system with the following limits on the free tier:
- Recipe Finder: 5 saved recipes
- Meal Planner: 10 meals per week
- Household: 3 members maximum

Premium subscribers get unlimited access to all features.

STRIPE_SECRET_KEY
STRIPE_PREMIUM_PRICE_ID
STRIPE_FAMILY_PRICE_ID


### Stripe Setup
1. **Create a Stripe account** at [stripe.com](https://stripe.com)
2. **Get your API keys** from the Stripe dashboard:
   - Publishable key (starts with `pk_test_` or `pk_live_`)
   - Secret key (starts with `sk_test_` or `sk_live_`)
3. **Create subscription products and prices** in your Stripe dashboard
4. **Add environment variables** to your `.env.local` file (see above)

### PayPal Setup
1. **Create a PayPal Business account** at [paypal.com](https://paypal.com)
2. **Set up PayPal Subscriptions:**
   - Go to your PayPal Developer Dashboard
   - Create subscription plans for Premium ($4.99/month) and Family ($9.99/month)
   - Get your Client ID and Client Secret from the Apps & Credentials section
3. **Add environment variables** to your `.env.local` file (see above)
4. **For production**, change `PAYPAL_ENVIRONMENT` to `live`

### Payment Flow
- Users see upgrade prompts when hitting free tier limits
- Clicking "Upgrade" navigates to Settings > Subscription tab
- Users can choose between Stripe (Credit Card) or PayPal
- Secure checkout handles payment processing
- Firebase Functions create/manage subscriptions on the backend
- Subscription status is stored in Firestore and synced across devices

### Testing the Payment Flow
**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

**PayPal Testing:**
- Use your PayPal Developer account to create sandbox buyer/seller accounts
- Test subscriptions will automatically cancel after a short period in sandbox mode
- Use sandbox credentials in your environment variables during development

Both payment methods support test subscriptions that will automatically cancel after a short period.

## Recent Changes
- Migrated inventory, shopping list, meal plan, and saved recipes to Firestore for household sharing
- Added Settings screen for notifications, theme, and feedback
- Integrated local notifications (Capacitor) for daily reminders
- Improved signup flow with validation and email verification
- Added Firebase Analytics events for login, tab changes, recipe saves, and settings changes
- `.env.local` is now used for API keys and is included in `.gitignore`

## Setup & Compilation
1. **Clone the repository:**
   ```
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```
2. **Install dependencies:**
   ```
   npm install
   ```
3. **Add your API keys:**
   - Create a `.env.local` file in the root directory:
     ```
     VITE_GEMINI_API_KEY=your_real_api_key
     VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
     STRIPE_SECRET_KEY=sk_test_your_secret_key_here
     VITE_STRIPE_PREMIUM_PRICE_ID=price_your_premium_price_id
     VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
     PAYPAL_CLIENT_ID=your_paypal_client_id
     PAYPAL_CLIENT_SECRET=your_paypal_client_secret
     PAYPAL_ENVIRONMENT=sandbox
     PAYPAL_PREMIUM_PLAN_ID=your_paypal_premium_plan_id
     ```
   - Do not commit this file (it's in `.gitignore`).
4. **Configure Firebase:**
   - Update `services/firebase.ts` (or `firebaseConfig.ts`) with your Firebase project settings.
5. **Build the web app:**
   ```
   npm run build
   ```
6. **Sync with Capacitor and Android:**
   ```
   npx cap sync android
   npx cap open android
   ```
7. **Build APK in Android Studio:**
   - Use Android Studio to build and test your APK.

## Notifications
- Daily notifications are scheduled using Capacitor Local Notifications.
- Users can enable/disable and set notification time in the Settings screen.

## Analytics
- Firebase Analytics tracks login, tab changes, recipe saves, and settings changes.
- View analytics in your Firebase console.

## Security
- Sensitive keys (API, Firebase) are stored in `.env.local` and not committed to git.
- Email verification is required for new users.

## Customization
- Users can change theme mode and accent color in Settings.
- Feedback form allows users to suggest features or report bugs.

## Recipe Sharing
- Saved recipes are shared between household members automatically.

## Useful Links
- [Capacitor Local Notifications](https://capacitorjs.com/docs/apis/local-notifications)
- [Firebase Analytics](https://firebase.google.com/docs/analytics)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe React SDK](https://stripe.com/docs/stripe-js/react)
- [PayPal Developer](https://developer.paypal.com)
- [PayPal Subscriptions](https://developer.paypal.com/docs/subscriptions/)

## Contact
For questions or feature requests, use the feedback form in the app or open an issue on GitHub.
