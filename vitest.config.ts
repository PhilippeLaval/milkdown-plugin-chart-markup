import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      'micromark-extension-chart-markup': resolve(__dirname, 'packages/micromark-extension-chart-markup/src/index.ts'),
      'mdast-util-chart-markup': resolve(__dirname, 'packages/mdast-util-chart-markup/src/index.ts'),
      '@philippe-laval/plugin-chart-markup': resolve(__dirname, 'packages/plugin-chart-markup/src/index.ts'),
      '@philippe-laval/plugin-chart-markup-react': resolve(__dirname, 'packages/plugin-chart-markup-react/src/index.tsx'),
    },
  },
  test: {
    include: ['packages/*/src/**/*.test.ts', 'packages/*/test/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
