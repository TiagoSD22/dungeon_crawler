import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
    port: 3000
  },
  json: {
    stringify: false
  }
});
