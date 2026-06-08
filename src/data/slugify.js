// Universal slugify that handles unicode (São→Sao), dashes, apostrophes
// Used by both server-side Astro pages and client-side JS
export const slugify = (name) => {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')     // strip diacritics
    .replace(/['']/g, '')                 // strip apostrophes
    .replace(/[–—]/g, '-')                // en/em-dash → hyphen
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
};

// Browser-friendly: exposes slugify on window when loaded as a script
if (typeof window !== 'undefined') {
  window.slugify = slugify;
}
