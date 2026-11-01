import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function glslRawPlugin(): Plugin {
  return {
    name: 'vite-plugin-glsl-raw',
    enforce: 'pre',
    load(id) {
      const cleanId = id.split('?')[0];
      if (cleanId.endsWith('.frag') || cleanId.endsWith('.vert') || cleanId.endsWith('.glsl')) {
        const code = fs.readFileSync(cleanId, 'utf-8');
        return `export default ${JSON.stringify(code)};`;
      }
      return null;
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [glslRawPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
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

