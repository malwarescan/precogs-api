# OurCasa API Key for Precogs Integration

**Date:** December 2024  
**Service:** Precogs API (https://precogs.croutons.ai)  
**Client:** OurCasa.ai

---

## API Key

```
9d2f74d5818e28a6c58d74ec4e807ee37e631be8a366e6b7c2855c06bae80ec0
```

**Status:** ✅ Active  
**Set in Railway:** precogs-api service → Variables → `API_KEY`

---

## Usage

### Environment Variable (OurCasa)

Set this in your OurCasa environment (`.env`, Railway, etc.):

```bash
OURCASA_PRECOGS_API_KEY=9d2f74d5818e28a6c58d74ec4e807ee37e631be8a366e6b7c2855c06bae80ec0
OURCASA_PRECOGS_API_URL=https://precogs.croutons.ai
```

### HTTP Request Format

All requests to Precogs API must include the Bearer token:

```http
POST https://precogs.croutons.ai/v1/run.ndjson
Authorization: Bearer 9d2f74d5818e28a6c58d74ec4e807ee37e631be8a366e6b7c2855c06bae80ec0
Content-Type: application/json

{
  "precog": "home.safety",
  "task": "diagnose",
  "content": "My garage keeps flooding when it rains. ZIP: 33908.",
  "region": "33908",
  "domain": "floodbarrierpros.com",
  "vertical": "flood_protection"
}
```

### PHP Example (PrecogsClient.php)

```php
$client = new PrecogsClient();

// The client should read from environment:
// OURCASA_PRECOGS_API_KEY=9d2f74d5818e28a6c58d74ec4e807ee37e631be8a366e6b7c2855c06bae80ec0

$result = $client->invoke(
    'home.safety',
    'diagnose',
    'My garage keeps flooding when it rains. ZIP: 33908.',
    [
        'region' => '33908',
        'domain' => 'floodbarrierpros.com',
        'vertical' => 'flood_protection'
    ]
);
```

---

## Test the API Key

### Quick Test (curl)

```bash
export PRECOGS_API_KEY="9d2f74d5818e28a6c58d74ec4e807ee37e631be8a366e6b7c2855c06bae80ec0"

curl -N "https://precogs.croutons.ai/v1/run.ndjson" \
  -H "Authorization: Bearer $PRECOGS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "precog": "home.safety",
    "task": "diagnose",
    "content": "My garage keeps flooding when it rains. ZIP: 33908."
  }'
```

**Expected:** Stream of NDJSON events with `answer.delta` events containing assessment, risk_score, recommended_steps, etc.

### Test Without Auth (Should Fail)

```bash
curl -N "https://precogs.croutons.ai/v1/run.ndjson" \
  -H "Content-Type: application/json" \
  -d '{
    "precog": "home.safety",
    "task": "diagnose",
    "content": "Test"
  }'
```

**Expected:** `{"ok":false,"error":"unauthorized"}` with HTTP 401

---

## Security Notes

1. **Keep this key secret** - Do not commit it to version control
2. **Rotate if compromised** - Contact Precogs team to generate a new key
3. **Rate limiting** - The API has rate limiting (60 requests/minute per IP)
4. **HTTPS only** - All requests must use HTTPS

---

## Troubleshooting

### Error: "unauthorized"

**Cause:** Missing or invalid API key in `Authorization` header.

**Solution:**
- Verify `OURCASA_PRECOGS_API_KEY` is set in your environment
- Check that the header format is: `Authorization: Bearer <key>`
- Ensure there are no extra spaces or newlines in the key

### Error: "precogs_unavailable"

**Cause:** Can't reach `https://precogs.croutons.ai` or service is down.

**Solution:**
- Check network connectivity
- Verify the API URL is correct: `https://precogs.croutons.ai`
- Check Precogs service status

---

## Support

For issues with:
- **API key access:** Contact Precogs/Croutons team
- **Integration questions:** See `PRECOGS_INTEGRATION_README.md`
- **OurCasa setup:** Contact OurCasa dev team

---

**API Key Generated:** December 2024  
**Last Updated:** December 2024


