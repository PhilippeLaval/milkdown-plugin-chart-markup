import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'micromark-extension-chart-markup': resolve(root, 'packages/micromark-extension-chart-markup/src/index.ts'),
      'mdast-util-chart-markup': resolve(root, 'packages/mdast-util-chart-markup/src/index.ts'),
      '@philippe-laval/plugin-chart-markup': resolve(root, 'packages/plugin-chart-markup/src/index.ts'),
      '@philippe-laval/plugin-chart-markup-react': resolve(root, 'packages/plugin-chart-markup-react/src/index.tsx'),
    },
  },
  server: {
    port: 5173,
    fs: { allow: [root] },
  },
});
