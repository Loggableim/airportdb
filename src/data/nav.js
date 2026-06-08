// Shared navigation data for all pages
export const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Search', href: '/#search' },
  { label: 'Continents', href: '/#continents' },
  { label: 'Countries', href: '/countries/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Database', href: '/download/' },
  { label: 'Tools', href: '/tools/', children: [
    { label: 'Distance Calculator', href: '/tools/distance-calculator/' },
    { label: 'IATA/ICAO Lookup', href: '/tools/iata-icao-lookup/' },
    { label: 'Nearest Airport', href: '/tools/nearest-airport/' },
    { label: 'Timezone Lookup', href: '/tools/timezone-lookup/' },
    { label: 'Airport Map', href: '/tools/airport-map/' },
  ]},
];

export const toolItems = [
  { id: 'distance', label: 'Distance Calculator', href: '/tools/distance-calculator/', icon: '📏', desc: 'Calculate distance between two airports' },
  { id: 'lookup', label: 'IATA/ICAO Lookup', href: '/tools/iata-icao-lookup/', icon: '🔍', desc: 'Search and convert IATA/ICAO codes' },
  { id: 'nearest', label: 'Nearest Airport', href: '/tools/nearest-airport/', icon: '📍', desc: 'Find airports near your location' },
  { id: 'timezone', label: 'Timezone Lookup', href: '/tools/timezone-lookup/', icon: '🕐', desc: 'Find timezone for any airport' },
  { id: 'map', label: 'Airport Map', href: '/tools/airport-map/', icon: '🗺️', desc: 'Browse airports on an interactive map' },
];
