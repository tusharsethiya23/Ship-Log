// Settings for Vite, the tool that runs the React app in development.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The official Tailwind plugin for Vite. It scans your files for class names
// like "bg-green-600" and generates only the CSS you actually use.
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // When the browser asks the React app (port 5173) for a URL starting with
    // /api or /auth, Vite quietly forwards it to our Express server (port 4000).
    // The browser thinks everything comes from one address, so login cookies
    // work without any extra setup.
    proxy: {
      '/api': 'http://localhost:4000',
      '/auth': 'http://localhost:4000',
    },
  },
});