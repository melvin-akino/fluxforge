import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@fluxforge/shared': resolve(__dirname, '../packages/shared/src'),
      '@shared':           resolve(__dirname, '../packages/shared/src'),
      '@':                 resolve(__dirname, 'src'),
      // Stub out @tauri-apps/api/core so PIWeb build never fails
      '@tauri-apps/api/core': resolve(__dirname, 'src/stubs/tauri-api-core.js'),
    },
  },

  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
