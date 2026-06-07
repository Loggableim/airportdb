import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://world-airport-database.com',
  output: 'static',
  build: {
    format: 'directory'
  },
  integrations: [
    sitemap({
      serialize: (item) => {
        // Prioritize airport pages
        if (item.url.includes('/airports/')) {
          item.changefreq = 'weekly';
          item.priority = 0.8;
        } else if (item.url.includes('/countries/')) {
          item.changefreq = 'weekly';
          item.priority = 0.7;
        } else if (item.url.includes('/tools/')) {
          item.changefreq = 'monthly';
          item.priority = 0.6;
        } else {
          item.changefreq = 'daily';
          item.priority = 1.0;
        }
        return item;
      }
    })
  ]
});