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
    },
  },

  define: {
    'import.meta.env.VITE_IS_TAURI': JSON.stringify('true'),
  },

  server: {
    port: 5173,
    strictPort: true,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
