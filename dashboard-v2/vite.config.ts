import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@xenova/transformers': path.resolve(__dirname, 'node_modules/@huggingface/transformers'),
      },
    },
    worker: { format: 'es' },
    build: {
      rollupOptions: {
        // jsvoice's published package omits its own `workers/` dir from its npm "files"
        // allowlist, so a clean `npm ci` (e.g. in Docker) can't resolve
        // jsvoice/workers/local-asr.worker.js even though it resolves locally from a
        // pre-existing node_modules cache. Externalizing keeps the rest of the app
        // buildable; the voice feature itself needs an upstream/patch fix separately.
        external: (id) => id.includes('jsvoice/workers/'),
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom', 'react-router'],
            'charts': ['recharts'],
            'motion': ['motion', 'framer-motion'],
            'ui': ['@headlessui/react', 'sonner'],
          },
        },
      },
      chunkSizeWarningLimit: 300,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
