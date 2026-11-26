import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

const isPages = process.env.VITE_PAGES_BUILD === '1';

export default defineConfig({
  base: isPages ? '/TMDB-Player/' : '/',
  plugins: isPages ? [react()] : [react(), cloudflare()],
  build: isPages ? { outDir: 'dist-pages', emptyOutDir: true } : undefined,
});
