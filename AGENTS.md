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
2. ❌ Astro-Projekt initialisieren
3. ❌ Basis-Templates bauen (Layout, Airport-Card, Suche)
4. ❌ Airport-Seiten generieren (Top 500 + DACH + IATA)
5. ❌ Länderseiten generieren
6. ❌ Tools bauen (IATA Lookup, Distance Calculator)
7. ❌ Suchfunktion (client-side)
8. ❌ Deploy auf Cloudflare Pages
9. ❌ Domain parken / DNS setzen
10. ❌ SEO (Sitemap, OG-Tags, JSON-LD)
11. ❌ Affiliate-Tests auf Top-Seiten