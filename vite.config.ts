import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import netlify from '@netlify/vite-plugin';

export default defineConfig(({ mode }) => {
  // Server-only Razorpay keys from .env reach the local Netlify functions via process.env, never the client bundle.
  if (!process.env.VITEST) {
    for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), 'RAZORPAY_'))) process.env[key] ??= value;
  }

  return {
    // The Netlify plugin runs netlify/functions (Razorpay API) inside `npm run dev`; tests call the handlers directly.
    plugins: [react(), ...(process.env.VITEST ? [] : [netlify({ edgeFunctions: { enabled: false } })])],
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            pdf: ['pdfjs-dist'],
            docx: ['docx'],
            mammoth: ['mammoth'],
          },
        },
      },
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  };
});
