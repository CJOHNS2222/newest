import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smart.pantry',
  appName: 'Smart Pantry',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
      excludePatterns: ["*firestore.googleapis.com*"]
    },
    // Browser: {
    //   toolbarColor: '#2A0A10'
    // }
  }
};

export default config;
