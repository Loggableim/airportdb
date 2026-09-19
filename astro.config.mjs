import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://world-airport-database.com',
  output: 'static',
  build: {
    format: 'directory'
  },
  integrations: []
});
