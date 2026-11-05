import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Assure des chemins relatifs pour l'exécution locale et Electron (file://)
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});

