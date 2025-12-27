import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // 加载环境变量
    const env = loadEnv(mode, '.', '');

    return {
      // 🟢 关键：如果你要部署到 GitHub Pages，必须加上这一行！
      // 把 'PolyRhythm-AI' 换成你的仓库名。
      // 如果你是本地运行，这行也不会有负面影响。
      base: '/PolyRhythm-AI/', 

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
      // 🟢 清理：移除了 define 中旧的 process.env 配置
      // 因为你现在已经在代码里用 import.meta.env.VITE_... 了，不需要这里 polyfill
    };
});