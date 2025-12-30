# Croutons CLI - Implementation Guide

## File Structure

```
croutons-cli/
├── bin/
│   └── croutons-init.js      # CLI entry point
├── templates/
│   ├── croutons.config.js.template
│   ├── docker-compose.yml.template
│   ├── examples/
│   │   └── send-facts.js.template
│   └── sdk/
│       └── index.js.template
├── package.json
├── README.md
└── .gitignore
```

## Testing Locally

### 1. Install dependencies

```bash
cd croutons-cli
npm install
```

### 2. Test the CLI in a temporary directory

```bash
mkdir /tmp/test-satellite
cd /tmp/test-satellite
node /path/to/croutons-cli/bin/croutons-init.js
```

### 3. Test the generated SDK

```bash
cd /tmp/test-satellite
export CROUTONS_API_KEY="grph_xxx"
node examples/send-facts.js
```

## Publishing to npm

### 1. Update version

```bash
npm version patch  # or minor, major
```

### 2. Publish

```bash
npm publish --access public
```

### 3. Test via npx

```bash
cd /tmp/test-satellite
npx @croutons/cli
```

## Development Notes

- The CLI uses ESM (ES modules) - requires Node.js ≥ 18
- Templates use simple string replacement (`{{PLACEHOLDER}}`)
- The SDK uses native `fetch` API (Node.js 18+)
- All generated files use ESM format (`type: "module"`)

## Integration Points

The CLI integrates with:
- **Ingestion API**: `/v1/streams/ingest` endpoint (Fastify service)
- **Authentication**: Bearer token via `Authorization` header
- **Data Format**: NDJSON with gzip compression
- **Headers**: `X-Dataset-Id`, `X-Site`, `X-Content-Hash`, `X-Schema-Version`

## Future Enhancements

- [ ] Retry logic with exponential backoff
- [ ] Stream validation before sending
- [ ] Local mock server for testing without Kafka
- [ ] Support for HMAC signing (enterprise)
- [ ] TypeScript types generation
- [ ] Browser build (for client-side usage)

