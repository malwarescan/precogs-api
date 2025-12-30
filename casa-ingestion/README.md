# CASA Environmental Data Ingestion Pipeline

NOAA data acquisition and normalization pipeline for the `environmental.local_climate` domain.

## Overview

This pipeline transforms raw NOAA API responses into validated croutons in the Croutons Graph:

```
NOAA API → Adapters → C-WNF → Croutons → Precogs
```

## Components

### 1. NOAA API Client (`/noaa/`)

Unified client for all NOAA Climate Data Online (CDO) API requests.

- **noaaClient.js** - Base client with rate limiting, retries, pagination
- **ghcndAdapter.js** - GHCND (daily climate) data adapter
- **lcdAdapter.js** - LCD (local climatological) data adapter
- **stormEventsAdapter.js** - Storm Events Database adapter
- **normalsAdapter.js** - Climate Normals (30-year averages) adapter

### 2. C-WNF Factory (`CWNFFactory.js`)

CASA Weather Normal Form - the strict intermediate format that all NOAA datasets convert into before becoming croutons.

Matches `environmental.local_climate:v1` schema exactly.

### 3. Normalizers (`/normalizers/`)

Convert raw NOAA data to C-WNF format:

- **ghcndToCwnf.js** - GHCND → C-WNF (temperature, precipitation, wind)
- **lcdToCwnf.js** - LCD → C-WNF (humidity derivation, UV index)
- **stormEventsToCwnf.js** - Storm Events → C-WNF (event classification)
- **normalsToCwnf.js** - Normals → C-WNF (seasonal baselines)

### 4. Crouton Emitter (`/emitter/`)

Validates C-WNF, generates crouton IDs, creates human-readable claims, and emits to Croutons Graph.

## Quick Start

### Prerequisites

```bash
# NOAA API token (required)
export NOAA_API_TOKEN="your_token_here"

# Croutons Graph URL
export CROUTONS_GRAPH_URL="https://your-graph-service.com"
```

### Installation

```bash
cd casa-ingestion
npm install
```

### Basic Usage

```javascript
const GhcndAdapter = require('./noaa/ghcndAdapter');
const GhcndToCwnf = require('./normalizers/ghcndToCwnf');
const CroutonEmitter = require('./emitter/croutonEmitter');

// 1. Fetch NOAA data
const adapter = new GhcndAdapter(process.env.NOAA_API_TOKEN);
const ghcndData = await adapter.fetchByZip('33907', '2024-01-01', '2024-12-31');

// 2. Normalize to C-WNF
const cwnfRecords = GhcndToCwnf.normalizeBatch(ghcndData, {
  zip: '33907',
  lat: 26.6406,
  lon: -81.8723,
  county: 'Lee'
});

// 3. Emit as croutons
const emitter = new CroutonEmitter(graphClient);
const results = await emitter.emitCroutons(cwnfRecords);

console.log(`Inserted ${results.inserted} croutons`);
```

## Data Flow

```
┌──────────────┐
│  NOAA API    │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   Adapter    │  (ghcndAdapter, lcdAdapter, etc.)
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  Normalizer  │  (ghcndToCwnf, lcdToCwnf, etc.)
└──────┬───────┘
       │
       ↓
┌──────────────┐
│    C-WNF     │  (Validated intermediate format)
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   Emitter    │  (Generates crouton IDs & claims)
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ Croutons     │
│ Graph        │
└──────────────┘
```

## C-WNF Format

All NOAA datasets normalize to this format:

```javascript
{
  // Temperature (°F)
  temp_max: 85.2,
  temp_min: 68.5,
  dew_point: 72.1,
  
  // Atmospheric
  precipitation: 0.25,      // inches
  humidity_index: 78,       // percentage
  wind_speed: 12.5,         // mph
  
  // Storm data
  storm_event: 'thunderstorm',
  storm_intensity: 'moderate',
  uv_proxy: 'high',
  
  // Seasonal context
  seasonality_vector: {
    season: 'summer',
    month: 7,
    day_of_year: 195,
    climate_zone: 'Cfa'
  },
  
  // Required
  date: '2024-07-14',       // ISO 8601
  source: 'GHCND',          // GHCND, LCD, StormEvents, Normals
  
  // Location
  zip: '33907',
  lat: 26.6406,
  lon: -81.8723,
  county: 'Lee',
  
  // Metadata
  station_id: 'GHCND:USW00012839',
  data_quality: 'verified'
}
```

## Unit Conversions

### GHCND
- Temperature: tenths of °C → °F
- Precipitation: tenths of mm → inches
- Wind speed: tenths of m/s → mph

### LCD
- Already in standard units (°F, inches, mph)
- Humidity derived from dew point

## Validation

All C-WNF records are validated against `environmental.local_climate:v1` schema:

```javascript
const CWNFFactory = require('./CWNFFactory');

const validation = CWNFFactory.validate(cwnf);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

## Error Handling

- **Invalid records** → Quarantined with error details
- **API failures** → Automatic retry with exponential backoff
- **Rate limits** → Automatic throttling (5 req/sec)

```javascript
// Check quarantined records
const quarantined = emitter.getQuarantined();
quarantined.forEach(item => {
  console.log('Record:', item.record);
  console.log('Errors:', item.errors);
});
```

## Metrics

Track ingestion performance:

```javascript
const metrics = emitter.getMetrics();
console.log(metrics);
// {
//   attempted: 1000,
//   inserted: 985,
//   failed: 5,
//   quarantined: 10,
//   successRate: '98.50%',
//   quarantineRate: '1.00%'
// }
```

## Testing

```bash
# Run unit tests
npm test

# Run smoke test for ZIP 33907
npm run smoke-test

# Validate C-WNF format
npm run validate-cwnf
```

## Scheduled Jobs

(Coming soon - Deliverable E)

- **GHCND** - Daily at 2 AM UTC
- **LCD** - Hourly
- **Storm Events** - Weekly on Sundays
- **Normals** - Yearly on January 1st

## Documentation

- **Phase 1 Summary**: `/CASA_PHASE_1_COMPLETE.md`
- **Phase 2 Status**: `/CASA_PHASE_2_STATUS.md`
- **Schema Reference**: `/SCHEMA_QUICK_REFERENCE.md`
- **Domain Docs**: `/graph-service/docs/environmental.local_climate.md`

## Support

For questions or issues:
1. Review the documentation above
2. Check `/CASA_PHASE_2_STATUS.md` for implementation details
3. Review individual component source files for inline documentation

## License

Internal use only - CASA x Croutons x Precogs integration project
