import path from 'path';
import { defineConfig } from 'vite'; // 不需要 loadEnv 了
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Vercel 部署通常不需要设置 base，或者设置为 '/'
  base: '/', 
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
});