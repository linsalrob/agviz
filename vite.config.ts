import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? "/",
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
