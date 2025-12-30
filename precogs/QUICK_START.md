# Precogs Quick Start

## 1. Deploy API

```bash
# Railway → New → GitHub → precogs-api
# Set env vars:
NODE_ENV=production
GRAPH_BASE=https://graph.croutons.ai
API_KEY=$(openssl rand -hex 32)

# Add Postgres + Redis (auto-sets DATABASE_URL, REDIS_URL)
# Run migrations:
npm run migrate
```

## 2. Deploy Worker

```bash
# Railway → New → GitHub → precogs-worker
# Set env vars (same DB/Redis as API):
NODE_ENV=production
DATABASE_URL=<same-as-api>
REDIS_URL=<same-as-api>
GRAPH_BASE=https://graph.croutons.ai
```

## 3. Test

```bash
export API_KEY="<your-key>"

# Create job
JOB_ID=$(curl -sS https://precogs.croutons.ai/v1/invoke \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"precog":"schema","prompt":"test","stream":true}' \
  | jq -r .job_id)

# Stream events
curl -N https://precogs.croutons.ai/v1/jobs/$JOB_ID/events
```

## 4. Cloudflare

- SSL Mode: Full
- Cache Rule: Bypass `/v1/jobs/*`

## Troubleshooting

- **No events?** Check worker logs for `XREADGROUP`
- **401 error?** Add `-H "Authorization: Bearer $API_KEY"`
- **SSE stalls?** Test via Railway domain directly

See `DEPLOYMENT_GUIDE.md` for full details.

