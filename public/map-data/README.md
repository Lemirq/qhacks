# Map Data - Static OpenStreetMap Data

This directory contains pre-processed OpenStreetMap data for the Kingston/Queen's University area.

## Data Files

- `buildings.json` - 4,800 buildings with footprints and heights (includes 1 custom building)
- `roads.json` - 387 nodes and 704 road edges with routing information
- `traffic-signals.json` - 344 traffic signals and stop signs

## Custom Buildings

### 20-Story Commercial Building
- **ID**: `building-custom-20story`
- **Location**: 44°13'54"N 76°28'47"W (Queen's University area)
- **Height**: 70 meters (20 stories)
- **Type**: Commercial
- **Footprint Coordinates**:
  - 44°13'54"N 76°28'45"W
  - 44°13'55"N 76°28'50"W
  - 44°13'54"N 76°28'50"W
  - 44°13'53"N 76°28'46"W

## Bounding Box

All data covers the following area:
- South: 44.220°
- West: -76.510°
- North: 44.240°
- East: -76.480°

## Data Source

Data was downloaded from OpenStreetMap Overpass API on February 7, 2026 and processed offline.

## Updating the Data

To update the map data:

1. Download fresh data:
```bash
# Buildings
curl -G "https://maps.mail.ru/osm/tools/overpass/api/interpreter" \
  --data-urlencode 'data=[out:json][timeout:60];(way["building"](44.220,-76.510,44.240,-76.480););(._;>;);out body;' \
  -o public/map-data/buildings-raw.json

# Traffic signals
curl -G "https://overpass-api.de/api/interpreter" \
  --data-urlencode 'data=[out:json][timeout:25];(node["highway"="traffic_signals"](44.220,-76.510,44.240,-76.480);node["highway"="stop"](44.220,-76.510,44.240,-76.480););out body;' \
  -o public/map-data/traffic-signals-raw.json

# Roads
curl -G "https://maps.mail.ru/osm/tools/overpass/api/interpreter" \
  --data-urlencode 'data=[out:json][timeout:60];(way["highway"~"^(primary|secondary|tertiary|residential|unclassified)$"](44.220,-76.510,44.240,-76.480););(._;>;);out body;' \
  -o public/map-data/roads-raw.json
```

2. Process the raw data:
```bash
npx tsx scripts/process-map-data.ts
```

3. The processed JSON files will be updated and ready to use

## Benefits

✅ **No external API calls** - Instant map loading
✅ **Offline capable** - Works without internet
✅ **Faster performance** - No network latency
✅ **Cost effective** - No API rate limits or quotas
✅ **Predictable** - Consistent data every time

## License

OpenStreetMap data is © OpenStreetMap contributors and available under the Open Database License (ODbL).
