import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin({ styleId: 'cio-agent-overview-styles' }),
  ],
  resolve: {
    alias: {
      '@src': path.resolve(dirname, 'src'),
    },
  },
  // This bundle includes React and runs straight in the browser, where there's no `process`.
  // Library mode leaves React's `process.env.NODE_ENV` checks in, so replace them here.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: path.resolve(dirname, 'src/standalone.tsx'),
      name: 'CioAgentOverview',
      fileName: () => 'constructorio-ui-agent-components.standalone.js',
      formats: ['umd'],
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
    outDir: 'dist/standalone',
  },
});
