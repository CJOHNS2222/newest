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

## Contact
For questions or feature requests, use the feedback form in the app or open an issue on GitHub.
