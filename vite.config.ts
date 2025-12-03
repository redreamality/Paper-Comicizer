import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY),
      'process.env.OPENROUTER_BASE_URL': JSON.stringify(env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'),
      'process.env.MODEL_LOGIC': JSON.stringify(env.MODEL_LOGIC ?? 'google/gemini-3-pro-preview'),
      'process.env.MODEL_IMAGE': JSON.stringify(env.MODEL_IMAGE ?? 'google/gemini-3-pro-image-preview'),
      'process.env.APP_URL': JSON.stringify(env.APP_URL ?? 'http://localhost:3000'),
      'process.env.APP_TITLE': JSON.stringify(env.APP_TITLE ?? 'Doraemon Paper Comicizer')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
