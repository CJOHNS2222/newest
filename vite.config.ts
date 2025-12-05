
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          manifest: {
            name: 'Smart Pantry',
            short_name: 'Pantry',
            start_url: '/',
            display: 'standalone',
            background_color: '#570404ff',
            theme_color: '#a51401ff',
            description: 'Manage your pantry, plan meals, and find recipes easily.',
            icons: [
              {
                src: 'icons/icon192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'icons/icon512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ],
            orientation: 'portrait'
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
