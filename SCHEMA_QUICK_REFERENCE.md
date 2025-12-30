# Environmental.Local_Climate Schema Quick Reference

**Version:** v1  
**Domain:** environmental.local_climate  
**Status:** ✅ Active

## Field Reference Card

| Field | Type | Required | Range/Values | Example |
|-------|------|----------|--------------|---------|
| **temp_max** | float | No | -100 to 150°F | 85.2 |
| **temp_min** | float | No | -100 to 150°F | 68.5 |
| **dew_point** | float | No | -100 to 100°F | 72.1 |
| **precipitation** | float | No | ≥ 0 inches | 0.25 |
| **humidity_index** | float | No | 0 to 100% | 78 |
| **wind_speed** | float | No | ≥ 0 mph | 12.5 |
| **storm_event** | string | No | See enum below | "thunderstorm" |
| **storm_intensity** | string | No | See enum below | "moderate" |
| **uv_proxy** | string | No | See enum below | "high" |
| **seasonality_vector** | object | No | See structure below | {...} |
| **date** | date | **YES** | YYYY-MM-DD | "2024-07-14" |
| **zip** | string | No | 12345 or 12345-6789 | "33301" |
| **lat** | float | No | -90 to 90 | 26.1224 |
| **lon** | float | No | -180 to 180 | -80.1373 |
| **county** | string | No | Any string | "Broward" |
| **source** | string | **YES** | See enum below | "GHCND" |

## Enumerations

### storm_event
```
none, thunderstorm, tornado, hurricane, tropical_storm, 
hail, flood, flash_flood, winter_storm, ice_storm, 
high_wind, other
```

### storm_intensity
```
none, minor, moderate, severe, extreme
```

### uv_proxy
```
low, moderate, high, very_high, extreme, unknown
```

### source
```
GHCND, LCD, StormEvents, Normals, other
```

## seasonality_vector Structure

```json
{
  "season": "winter|spring|summer|fall",
  "month": 1-12,
  "day_of_year": 1-366,
  "climate_zone": "Köppen classification"
}
```

## Minimal Valid Record

```json
{
  "date": "2024-07-14",
  "source": "GHCND"
}
```

## Complete Example

```json
{
  "temp_max": 85.2,
  "temp_min": 68.5,
  "dew_point": 72.1,
  "precipitation": 0.25,
  "humidity_index": 78,
  "wind_speed": 12.5,
  "storm_event": "thunderstorm",
  "storm_intensity": "moderate",
  "uv_proxy": "high",
  "seasonality_vector": {
    "season": "summer",
    "month": 7,
    "day_of_year": 195,
    "climate_zone": "Cfa"
  },
  "date": "2024-07-14",
  "zip": "33301",
  "lat": 26.1224,
  "lon": -80.1373,
  "county": "Broward",
  "source": "GHCND",
  "station_id": "GHCND:USW00012839",
  "data_quality": "verified"
}
```

## Crouton Format

```json
{
  "@type": "Factlet",
  "fact_id": "env:climate:33301:2024-07-14",
  "corpus_id": "environmental.local_climate",
  "page_id": "environmental.local_climate",
  "claim": "Fort Lauderdale experienced moderate thunderstorm activity...",
  "normalized": { /* fields above */ }
}
```

## Common Queries

### By ZIP Code
```sql
SELECT * FROM v_environmental_climate 
WHERE zip = '33301' 
ORDER BY observation_date DESC 
LIMIT 30;
```

### By Date Range
```sql
SELECT * FROM v_environmental_climate 
WHERE observation_date BETWEEN '2024-01-01' AND '2024-12-31'
AND zip = '33301';
```

### Storm Events Only
```sql
SELECT * FROM v_environmental_climate 
WHERE storm_event IS NOT NULL 
AND storm_event != 'none'
ORDER BY observation_date DESC;
```

### High Temperature Days
```sql
SELECT * FROM v_environmental_climate 
WHERE temp_max > 95
AND zip = '33301';
```

## API Endpoints

### Graph API
```
GET /api/query?corpus=environmental.local_climate&q=33301
```

### Ingestion
```
POST /v1/streams/ingest
Headers:
  Authorization: Bearer <api_key>
  X-Dataset-Id: environmental.local_climate
  X-Site: environmental.local_climate
Body: NDJSON stream
```

## Validation

```javascript
const { validateClimateData } = require('./environmental-climate-client');

const result = validateClimateData(data);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## Files

- **Schema:** `/graph-service/schemas/environmental.local_climate.v1.json`
- **Migration:** `/graph-service/migrations/009_environmental_climate_domain.sql`
- **Docs:** `/graph-service/docs/environmental.local_climate.md`
- **Client:** `/precogs/precogs-api/src/integrations/environmental-climate-client.js`

---

**Quick Start:** Copy the complete example above and modify the values for your use case.
