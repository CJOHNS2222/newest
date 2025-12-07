import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smart.pantry',
  appName: 'Smart Pantry',
  webDir: 'dist',
  plugins: {
    App: {
      // Handle deep links like smartpantry://invite?email=...
      schemes: ['smartpantry']
    }
  }
};

export default config;
