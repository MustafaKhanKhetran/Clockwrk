import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const pages = Object.fromEntries(
  readdirSync(import.meta.dirname)
    .filter((file) => file.endsWith('.html'))
    .map((file) => [file.replace(/\.html$/, ''), resolve(import.meta.dirname, file)])
);

export default defineConfig({
  server: { port: 5175, strictPort: true },
  preview: { port: 4175, strictPort: true },
  build: {
    rollupOptions: { input: pages },
  },
});
