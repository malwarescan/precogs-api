# Croutons CLI

Bootstrap Croutons satellite integrations for web projects. This CLI generates a minimal SDK and configuration files to connect your website to the Croutons knowledge graph ingestion pipeline.

## Installation

```bash
npx @croutons/cli
```

Or install globally:

```bash
npm install -g @croutons/cli
croutons-init
```

## Quick Start

```bash
cd my-website/
npx @croutons/cli
# Follow prompts for dataset ID, site URL, API key
npm run croutons:test
```

## What It Creates

- **croutons.config.js** - Configuration file with API URL, keys, and dataset metadata
- **croutons-sdk/index.js** - HTTP client SDK for sending factlets to `/v1/streams/ingest`
- **examples/send-facts.js** - Working example demonstrating how to send facts
- **docker-compose.yml** - (Optional) Local Redpanda instance for testing

## Usage

### Sending a Single Factlet

```javascript
import { sendFactlet } from './croutons-sdk/index.js';

await sendFactlet({
  '@type': 'Factlet',
  page_id: 'https://mysite.com/page',
  passage_id: 'https://mysite.com/page#p1',
  fact_id: 'https://mysite.com/page#f1',
  claim: 'We serve South Bend and Mishawaka.'
});
```

### Sending Multiple Factlets

```javascript
import { sendBatchFacts } from './croutons-sdk/index.js';

await sendBatchFacts([
  { '@type': 'Page', '@id': 'https://mysite.com/', ... },
  { '@type': 'Factlet', page_id: '...', ... }
]);
```

## Configuration

Set environment variables to override defaults:

```bash
export CROUTONS_API_URL="https://graph.croutons.ai"
export CROUTONS_API_KEY="grph_xxx"
```

## Architecture

```
Website Satellite → HTTP → Ingestion API → Kafka → Graph Pipeline
```

The SDK handles:
- JSON serialization + gzip compression
- Streaming to `/v1/streams/ingest`
- Bearer token authentication
- Batch sending for multiple factlets

## Development

```bash
cd croutons-cli
npm install
npm test  # Run CLI locally
```

## License

MIT

