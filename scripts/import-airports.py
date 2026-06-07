import csv, json, os, sys
from collections import defaultdict

csv_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'world-airports.csv')
out_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')

os.makedirs(out_dir, exist_ok=True)

airports = []
errors = 0
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            iata = row.get('iata_code', '').strip().upper()
            if not iata:
                continue
            name = row.get('name', '').strip()
            if not name:
                continue
            airports.append({
                'id': int(row['id']),
                'iata': iata,
                'icao': row.get('icao_code', '').strip().upper() or iata,
                'type': row.get('type', ''),
                'name': name,
                'lat': float(row['latitude_deg']) if row.get('latitude_deg') else 0,
                'lon': float(row['longitude_deg']) if row.get('longitude_deg') else 0,
                'elevation': int(float(row['elevation_ft'])) if row.get('elevation_ft') else None,
                'continent': row.get('continent', ''),
                'country': row.get('country_name', ''),
                'iso_country': row.get('iso_country', ''),
                'municipality': row.get('municipality', ''),
                'scheduled': row.get('scheduled_service', '0') == '1',
                'score': int(float(row.get('score', 0))) if row.get('score') else 0,
            })
        except Exception as e:
            errors += 1

airports.sort(key=lambda a: -a['score'])
print(f"Parsed {len(airports)} IATA airports ({errors} errors)", flush=True)

# Top 500
top500 = airports[:500]
print(f"Top 500: score {top500[0]['score']} -> {top500[-1]['score']}", flush=True)

# Countries 
countries = defaultdict(lambda: {'count': 0, 'large': 0})
for a in airports:
    countries[a['country']]['count'] += 1
    if a['type'] == 'large_airport': countries[a['country']]['large'] += 1

country_list = [{'name': k, **v} for k, v in sorted(countries.items(), key=lambda x: -x[1]['count'])]

# Continents
cont_names = {'EU':'Europe','NA':'North America','SA':'South America','AS':'Asia','AF':'Africa','OC':'Oceania','AN':'Antarctica'}
cont = defaultdict(lambda: {'count': 0})
for a in airports:
    cont[a['continent']]['count'] += 1
continent_list = [{'code': k, 'name': cont_names.get(k, k), **v} for k, v in sorted(cont.items())]

# Types
types = defaultdict(int)
for a in airports:
    types[a['type']] += 1
type_list = [{'type': k, 'count': v} for k, v in sorted(types.items(), key=lambda x: -x[1])]

# Write
for fn, data in [('top500.json', top500), ('all-iata.json', airports), 
                  ('countries.json', country_list), ('continents.json', continent_list),
                  ('types.json', type_list)]:
    path = os.path.join(out_dir, fn)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    size = os.path.getsize(path) / 1024
    print(f"  {fn}: {len(data)} items, {size:.0f} KB", flush=True)

print(f"\nDone! Files in {out_dir}", flush=True)