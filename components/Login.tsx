import React, { useState, useEffect } from 'react';
import { ChefHat, Mail, Chrome } from 'lucide-react';
import { User } from '../types';
import { Browser } from '@capacitor/browser';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebaseConfig';



interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  };

  const validatePassword = (password: string) => {
    // At least 6 chars, one number, one letter
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters and contain a number and a letter.');
      return;
    }
    if (isSignup) {
      if (!name.trim()) {
        setError('Please enter your name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }
    try {
      const auth = getAuth();
      let userCredential;
      if (isSignup) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await sendEmailVerification(user);
        if (analytics) {
          logEvent(analytics, 'sign_up', { email: user.email, provider: 'email' });
        }
        setSuccess('Signup successful! Please check your email to verify your account.');
        onLogin({
          id: user.uid,
          name: name,
          email: user.email || '',
          provider: 'email',
          hasSeenTutorial: false
        });
        return;
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (analytics) {
          logEvent(analytics, 'login', { email: userCredential.user.email, provider: 'email' });
        }
        setSuccess('Login successful!');
        const user = userCredential.user;
        onLogin({
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || '',
          email: user.email || '',
          provider: 'email',
          hasSeenTutorial: false
        });
      }
    } catch (error) {
      setError((isSignup ? 'Signup' : 'Login') + ' failed: ' + (error as Error).message);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setSuccess(null);
    if (!validateEmail(email)) {
      setError('Please enter your email address above to reset password.');
      return;
    }
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      setSuccess('Password reset email sent! Please check your inbox.');
    } catch (error) {
      setError('Failed to send reset email: ' + (error as Error).message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const auth = getAuth();
      const googleProvider = new GoogleAuthProvider();
      googleProvider.addScope('email');
      googleProvider.addScope('profile');

      // For mobile, we need to handle the redirect differently
      if ((window as any).Capacitor && Browser) {
        // Set the redirect URL for mobile
        googleProvider.setCustomParameters({
          prompt: 'select_account'
        });

        // Use redirect for mobile with Capacitor Browser
        await signInWithRedirect(auth, googleProvider);
      } else {
        // Desktop: Try popup first, fallback to redirect if popup fails
        try {
          const result = await signInWithPopup(auth, googleProvider);
          const user = result.user;
          if (analytics) {
            logEvent(analytics, 'login', { email: user.email, provider: 'google' });
          }
          onLogin({
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || '',
            email: user.email || '',
            provider: 'google',
            hasSeenTutorial: false
          });
        } catch (popupError: any) {
          console.log('Popup failed, trying redirect:', popupError);
          // If popup is blocked or fails, use redirect as fallback
          if (popupError.code === 'auth/popup-blocked' ||
              popupError.code === 'auth/popup-closed-by-user' ||
              popupError.code === 'auth/cancelled-popup-request') {
            await signInWithRedirect(auth, googleProvider);
          } else {
            throw popupError;
          }
        }
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      setError('Google login failed: ' + error.message);
    }
  };

  // Handle Google redirect result (for mobile and fallback)
  useEffect(() => {
    const checkRedirect = async () => {
      const auth = getAuth();
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const user = result.user;
          if (analytics) {
            logEvent(analytics, 'login', { email: user.email, provider: 'google' });
          }
          onLogin({
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || '',
            email: user.email || '',
            provider: 'google',
            hasSeenTutorial: false
          });
        }
      } catch (error: any) {
        console.log('Redirect result error:', error);
        // Only show error if it's not a "no redirect result" scenario
        if (error.code !== 'auth/null-user' && error.code !== 'auth/user-cancelled') {
          setError('Google login failed: ' + error.message);
        }
      }
    };

    // Check immediately and also listen for auth state changes
    checkRedirect();

    // Also listen for auth state changes in case the redirect happens while component is mounted
    const unsubscribe = getAuth().onAuthStateChanged((user) => {
      if (user && user.providerData.some(provider => provider.providerId === 'google.com')) {
        // User is signed in with Google, trigger login callback
        if (analytics) {
          logEvent(analytics, 'login', { email: user.email, provider: 'google' });
        }
        onLogin({
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || '',
          email: user.email || '',
          provider: 'google',
          hasSeenTutorial: false
        });
      }
    });

    return unsubscribe;
  }, [onLogin]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#2A0A10] text-white relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-[#2A0A10] to-[#2A0A10] z-0"></div>

      <div className="w-full max-w-md bg-[#3F1016] border border-red-900/30 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg mb-4">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold font-serif tracking-wide text-amber-50">
            Smart Pantry Chef
          </h1>
          <p className="text-red-200/60 mt-2 text-sm uppercase tracking-widest">
            Your Personal AI Sous Chef
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {error && <div className="text-red-400 text-xs mb-2">{error}</div>}
          {success && <div className="text-green-400 text-xs mb-2">{success}</div>}
          {isSignup && (
            <div>
              <label className="block text-xs font-bold text-amber-500 uppercase mb-1 ml-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#2A0A10] border border-red-900/50 rounded-xl px-4 py-3 text-white placeholder-red-900/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                placeholder="Your Name"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-amber-500 uppercase mb-1 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#2A0A10] border border-red-900/50 rounded-xl px-4 py-3 text-white placeholder-red-900/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
              placeholder="chef@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-amber-500 uppercase mb-1 ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#2A0A10] border border-red-900/50 rounded-xl px-4 py-3 text-white placeholder-red-900/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
              placeholder="••••••••"
              required
            />
             {!isSignup && (
               <button
                 type="button"
                 onClick={handleForgotPassword}
                 className="w-full mt-2 text-amber-400 underline text-xs text-left hover:text-amber-500"
               >
                 Forgot password?
               </button>
             )}
          </div>
          {isSignup && (
            <div>
              <label className="block text-xs font-bold text-amber-500 uppercase mb-1 ml-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#2A0A10] border border-red-900/50 rounded-xl px-4 py-3 text-white placeholder-red-900/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                placeholder="Re-enter password"
                required
              />
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-amber-700 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-amber-900/20 transition-all transform active:scale-95 mt-2"
          >
            {isSignup ? 'Sign Up' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="w-full mt-2 text-amber-500 underline text-sm"
          >
            {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px bg-red-900/30 flex-1"></div>
          <span className="text-xs text-red-200/40 font-medium">OR CONTINUE WITH</span>
          <div className="h-px bg-red-900/30 flex-1"></div>
        </div>
//
//        <div className="grid grid-cols-1 gap-4">
  //        <button
  //          type="button"
 //           onClick={handleGoogleLogin}
  //          className="flex items-center justify-center gap-2 bg-white text-gray-800 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Chrome className="w-5 h-5 text-red-500" />
            Google
          </button>
        </div>
      </div>
    </div>
  );
};