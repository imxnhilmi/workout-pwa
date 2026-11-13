/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { driveApiVitePlugin } from './server/driveApiPlugin';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    driveApiVitePlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Custom Gym Workout Tracker',
        short_name: 'GymLog',
        description: 'Fast, offline-first progressive overload gym workout tracker',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
