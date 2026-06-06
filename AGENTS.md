# AGENTS.md — AirportDB (world-airport-database.com)

## Projekt

Airport-Code-Datenbank + Airport-Profilseiten + Travel Tools.

**Domain:** world-airport-database.com
**Hosting:** Cloudflare Pages (SSG)
**Datenbasis:** OurAirports CSV → 85.545 Airports, 9.056 mit IATA-Code, 247 Länder

## CMS-Entscheidung: Astro SSG

Warum Astro:
- Perfekt für datengetriebene statische Seiten mit 1k-10k+ URLs
- `getStaticPaths()` generiert Airport-Seiten, Länder-Seiten, Tool-Seiten
- Partial Hydration für interaktive Tools (Search, Distance Calculator)
- Native Cloudflare Pages Deploy-Unterstützung
- Wir haben bereits Astro-Erfahrung (nauru, tirol)
- `.astro` Komponenten + Markdown wo sinnvoll

Nicht WordPress (zu schwer, Security) oder Next.js (zu komplex für statische Sites).

## Daten

`data/world-airports.csv` — 85.545 Zeilen, OurAirports-Format mit:
- id, ident, type, name, lat/lng, elevation, continent, country, region, municipality
- iata_code, icao_code, gps_code, local_code
- home_link, wikipedia_link, keywords, score

### Strategie: Nur IATA-Airports als vollwertige Seiten
~9.056 Airports mit IATA-Code → eigene Profilseite
Restliche 76.489 → durchsuchbar via Client-Side Search, kein eigenes HTML

## URL-Struktur

```
/
├── airport-codes/            # IATA/ICAO Übersicht
├── iata-codes/               # IATA Code Liste
├── icao-codes/               # ICAO Code Liste
├── airports/
│   ├── germany/              # Nach Land
│   │   ├── frankfurt-fra/
│   │   └── munich-muc/
│   ├── austria/
│   │   └── vienna-vie/
│   └── ... (alle Länder mit IATA-Airports)
├── countries/
│   ├── germany/
│   ├── austria/
│   └── ...
├── tools/
│   ├── airport-distance-calculator/
│   ├── iata-icao-lookup/
│   └── nearest-airport-finder/
├── search/                   # SPA-Suche (client-side)
```

Airport-Seite: `/airports/[country-slug]/[airport-slug]/`
Slug-Format: `name-iata` (z.B. `frankfurt-fra`)

## Tech-Stack

| Komponente | Wahl | Grund |
|------------|------|-------|
| Framework | Astro 5 | SSG, Partial Hydration, Cloudflare-native |
| CSS | Tailwind CSS | Utility-first, schnell, kompatibel |
| Search | Fuse.js + Precomputed Index | Client-seitig, keine API nötig |
| Maps | Leaflet (OpenStreetMap) | Kostenlos, kein API-Key |
| Daten-Import | Python Script (CSV → JSON) | Vorverarbeitung |
| Hosting | Cloudflare Pages | Kostenlos, CDN, Wrangler-Deploy |
| Domain | world-airport-database.com | Expired, altes Backlink-Profil |
| Analytics | Cloudflare Web Analytics | Kostenlos, DSGVO-konform |

## Design-Richtlinien

- **Oldschool-Datenbank-Charme** — kein modernes Startup-Design
- Tabellen-lastig für Code-Listen
- Airport-Seiten: Hero (Name/Code) → Daten-Tabelle → Map → Nearby Airports → Affiliate-Links
- Dark/Light Mode über CSS-Variablen
- Responsive (viel Traffic kommt mobil)

## Monetarisierung

1. **Affiliate-Links auf Airport-Seiten:**
   - Holiday Extras (Parking, Hotels, Lounges)
   - eSIM-Anbieter
   - Mietwagen (Booking.com / Expedia)
   - Airport-Transfer (GetYourGuide)
2. **Display Ads** (später, nach Traffic)
3. **API-Zugang** (gegen Gebühr, als Enterprise-Feature)

## Affiliate-Hinweis

"world-airport-database.com is an independent airport information database based on open data sources. It is not affiliated with IATA or ICAO."

## Build-Prozess

```bash
# Daten vorbereiten
python scripts/import-airports.py    # CSV → JSON, generiert Suchindex

# Astro bauen
npx astro build                      # Erzeugt public/

# Deploy
npx wrangler pages deploy dist/ --project-name airportdb --branch main
```

## Nächste Schritte (MVP)

1. ✅ Daten (CSV importiert)
2. ✅ Astro-Projekt initialisiert (v6.4.4, Cloudflare-Adapter)
3. ✅ Basis-Templates gebaut (Oldschool DB Look + Canvas 2D Hero)
4. ✅ Tools gebaut (D3 Bubble+Bar Charts, Search+Filter, Distance Calculator mit Globe)
5. ✅ Deploy auf Cloudflare Pages (https://87ebc85e.airportdb.pages.dev)
6. ✅ Domain registriert + DNS (ALIAS/CNAME → airportdb.pages.dev)
7. ✅ GitHub Repo (https://github.com/Loggableim/airportdb)
8. ✅ Custom Domain auf Cloudflare Pages (world-airport-database.com, pending)
9. ❌ Daten-Import Script (CSV → Astro getStaticPaths Top 500)
10. ❌ 500 Airport-Profilseiten als Astro-Routes
11. ❌ Länder-Seiten generieren (247 Länder)
12. ❌ Nearest Airport Finder Tool
13. ❌ SEO (Sitemap, OG-Tags, JSON-LD, Search Console)
14. ❌ Content-Cron (3x täglich)