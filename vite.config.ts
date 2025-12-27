import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    return {
      // ✅ 智能路径配置：
      // 如果是生产环境构建 (npm run build)，则使用 '/polyrhythm-ai/'
      // 如果是本地开发 (npm run dev)，则使用 '/'
      base: mode === 'production' ? '/polyrhythm-ai/' : '/',

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
    };
});