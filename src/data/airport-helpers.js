// Shared helpers for airport subpages
export const makeSlug = (name) => (name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,60);

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function getClimateZone(lat) {
  const abs = Math.abs(lat);
  if (abs > 66.5) return 'arctic';
  if (abs > 23.5) return 'temperate';
  return 'tropical';
}

export function getClimateData(lat) {
  const zone = getClimateZone(lat);
  const zones = {
    arctic: {
      label: 'Arctic / Polar',
      months: [
        { m:'Jan', lo:-20, hi:-10 }, { m:'Feb', lo:-19, hi:-9 }, { m:'Mar', lo:-15, hi:-5 },
        { m:'Apr', lo:-10, hi:0 },   { m:'May', lo:-3, hi:5 },   { m:'Jun', lo:2, hi:10 },
        { m:'Jul', lo:5, hi:15 },    { m:'Aug', lo:4, hi:12 },   { m:'Sep', lo:0, hi:7 },
        { m:'Oct', lo:-5, hi:1 },    { m:'Nov', lo:-12, hi:-3 }, { m:'Dec', lo:-18, hi:-8 }
      ]
    },
    temperate: {
      label: 'Temperate',
      months: [
        { m:'Jan', lo:0, hi:8 },   { m:'Feb', lo:1, hi:10 },  { m:'Mar', lo:4, hi:13 },
        { m:'Apr', lo:7, hi:17 },  { m:'May', lo:11, hi:21 }, { m:'Jun', lo:15, hi:26 },
        { m:'Jul', lo:17, hi:28 }, { m:'Aug', lo:16, hi:27 }, { m:'Sep', lo:13, hi:23 },
        { m:'Oct', lo:9, hi:18 },  { m:'Nov', lo:5, hi:12 },  { m:'Dec', lo:1, hi:9 }
      ]
    },
    tropical: {
      label: 'Tropical',
      months: [
        { m:'Jan', lo:22, hi:30 }, { m:'Feb', lo:22, hi:30 }, { m:'Mar', lo:22, hi:31 },
        { m:'Apr', lo:23, hi:31 }, { m:'May', lo:23, hi:31 }, { m:'Jun', lo:23, hi:31 },
        { m:'Jul', lo:22, hi:30 }, { m:'Aug', lo:22, hi:30 }, { m:'Sep', lo:22, hi:30 },
        { m:'Oct', lo:22, hi:30 }, { m:'Nov', lo:22, hi:30 }, { m:'Dec', lo:22, hi:30 }
      ]
    }
  };
  return zones[zone] || zones.temperate;
}

export function getBestSeason(country, continent) {
  const seasonMap = {
    EU: { best: 'April – October', why: 'Mild weather, minimal disruptions', seasons: { spring:'Mar–May', summer:'Jun–Aug', autumn:'Sep–Nov', winter:'Dec–Feb' }},
    NA: { best: 'May – September', why: 'Pleasant temperatures across most regions', seasons: { spring:'Mar–May', summer:'Jun–Aug', autumn:'Sep–Nov', winter:'Dec–Feb' }},
    AS: { best: 'November – March', why: 'Dry season across much of Asia', seasons: { spring:'Mar–May', summer:'Jun–Aug', autumn:'Sep–Nov', winter:'Dec–Feb' }},
    SA: { best: 'May – October', why: 'Dry season in most of South America', seasons: { dry:'May–Oct', wet:'Nov–Apr' }},
    AF: { best: 'November – February', why: 'Cooler dry season across Africa', seasons: { dry:'Nov–Feb', wet:'Mar–Oct' }},
    OC: { best: 'April – October', why: 'Cooler dry season in Oceania', seasons: { dry:'Apr–Oct', wet:'Nov–Mar' }},
    AN: { best: 'November – February', why: 'Austral summer, accessible', seasons: { summer:'Nov–Feb', winter:'Mar–Oct' }}
  };
  const caribbeanCountries = ['Antigua and Barbuda','Bahamas','Barbados','Belize','Bermuda','Cayman Islands','Costa Rica','Cuba','Dominica','Dominican Republic','El Salvador','Grenada','Guatemala','Haiti','Honduras','Jamaica','Mexico','Nicaragua','Panama','Puerto Rico','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Trinidad and Tobago','Turks and Caicos Islands','United States Virgin Islands','British Virgin Islands','Anguilla','Aruba','Bonaire','Curaçao','Guadeloupe','Martinique','Montserrat','Saba','Saint Barthélemy','Saint Martin','Sint Eustatius','Sint Maarten'];
  if (caribbeanCountries.includes(country)) {
    return { best: 'December – April', why: 'Dry season, avoids hurricane months (Jun–Nov)', seasons: { dry:'Dec–Apr', wet:'May–Nov' }};
  }
  const gulfCountries = ['United Arab Emirates','Qatar','Bahrain','Kuwait','Oman','Saudi Arabia'];
  if (gulfCountries.includes(country)) {
    return { best: 'November – March', why: 'Pleasant temperatures, avoids extreme summer heat', seasons: { cool:'Nov–Mar', hot:'Apr–Oct' }};
  }
  return seasonMap[continent] || { best: 'Year-round', why: 'Mild climate throughout the year', seasons: {} };
}

export function getAirlinesForRegion(iata, country, continent) {
  const airlineMap = {
    EU: [
      { code: 'LH', name: 'Lufthansa', alliance: 'Star Alliance' },
      { code: 'FR', name: 'Ryanair', alliance: 'Low-cost' },
      { code: 'BA', name: 'British Airways', alliance: 'Oneworld' },
      { code: 'AF', name: 'Air France', alliance: 'SkyTeam' },
      { code: 'KL', name: 'KLM', alliance: 'SkyTeam' },
      { code: 'IB', name: 'Iberia', alliance: 'Oneworld' },
      { code: 'TK', name: 'Turkish Airlines', alliance: 'Star Alliance' },
      { code: 'U2', name: 'easyJet', alliance: 'Low-cost' },
    ],
    NA: [
      { code: 'AA', name: 'American Airlines', alliance: 'Oneworld' },
      { code: 'DL', name: 'Delta Air Lines', alliance: 'SkyTeam' },
      { code: 'UA', name: 'United Airlines', alliance: 'Star Alliance' },
      { code: 'WN', name: 'Southwest Airlines', alliance: 'Low-cost' },
      { code: 'AS', name: 'Alaska Airlines', alliance: 'Oneworld' },
      { code: 'B6', name: 'JetBlue', alliance: 'Low-cost' },
      { code: 'AC', name: 'Air Canada', alliance: 'Star Alliance' },
    ],
    AS: [
      { code: 'SQ', name: 'Singapore Airlines', alliance: 'Star Alliance' },
      { code: 'CX', name: 'Cathay Pacific', alliance: 'Oneworld' },
      { code: 'EK', name: 'Emirates', alliance: 'Independent' },
      { code: 'QR', name: 'Qatar Airways', alliance: 'Oneworld' },
      { code: 'EY', name: 'Etihad Airways', alliance: 'Independent' },
      { code: 'NH', name: 'ANA', alliance: 'Star Alliance' },
      { code: 'JL', name: 'Japan Airlines', alliance: 'Oneworld' },
      { code: 'CA', name: 'Air China', alliance: 'Star Alliance' },
      { code: 'TG', name: 'Thai Airways', alliance: 'Star Alliance' },
    ],
    SA: [
      { code: 'LA', name: 'LATAM Airlines', alliance: 'Oneworld' },
      { code: 'G3', name: 'Gol Airlines', alliance: 'Independent' },
      { code: 'AR', name: 'Aerolíneas Argentinas', alliance: 'SkyTeam' },
      { code: 'AV', name: 'Avianca', alliance: 'Star Alliance' },
    ],
    AF: [
      { code: 'ET', name: 'Ethiopian Airlines', alliance: 'Star Alliance' },
      { code: 'MS', name: 'EgyptAir', alliance: 'Star Alliance' },
      { code: 'SA', name: 'South African Airways', alliance: 'Star Alliance' },
      { code: 'KQ', name: 'Kenya Airways', alliance: 'SkyTeam' },
    ],
    OC: [
      { code: 'QF', name: 'Qantas', alliance: 'Oneworld' },
      { code: 'VA', name: 'Virgin Australia', alliance: 'Independent' },
      { code: 'NZ', name: 'Air New Zealand', alliance: 'Star Alliance' },
      { code: 'FJ', name: 'Fiji Airways', alliance: 'Oneworld' },
    ],
  };
  return airlineMap[continent] || [];
}

export function allianceClass(alliance) {
  const map = { 'Star Alliance': 'star', 'Oneworld': 'oneworld', 'SkyTeam': 'skyteam', 'Low-cost': 'low', 'Independent': 'independent' };
  return map[alliance] || 'independent';
}

export function climateBarColor(hi, lo) {
  const avg = (hi + lo) / 2;
  if (avg > 25) return 'linear-gradient(180deg,#fff7ed,#fed7aa)';
  if (avg > 15) return 'linear-gradient(180deg,#f0fdf4,#bbf7d0)';
  if (avg > 5) return 'linear-gradient(180deg,#f0f9ff,#bae6fd)';
  return 'linear-gradient(180deg,#f8fafc,#e2e8f0)';
}
