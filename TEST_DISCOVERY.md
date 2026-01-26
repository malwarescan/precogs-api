# Testing Croutons Protocol Discovery

## Quick Test for nrlc.ai

### Step 1: Verify Domain

```bash
# Initiate verification
curl -X POST https://precogs.croutons.ai/v1/verify/initiate \
  -H "Content-Type: application/json" \
  -d '{"domain":"nrlc.ai"}'
```

**Response:**
```json
{
  "domain": "nrlc.ai",
  "verification_token": "abc123...",
  "txt_record": "croutons-verification=abc123...",
  "instructions": {
    "step1": "Add this DNS TXT record to your domain:",
    "record": "croutons-verification=abc123...",
    "step2": "Wait 2-5 minutes for DNS propagation",
    "step3": "Call POST /v1/verify/check to confirm"
  }
}
```

### Step 2: Add Verification

**Option A: DNS TXT Record**
```
Add to DNS: croutons-verification=abc123...
```

**Option B: HTTP Well-Known File**
```
Create: https://nrlc.ai/.well-known/croutons-verification.txt
Content: abc123...
```

### Step 3: Check Verification

```bash
curl -X POST https://precogs.croutons.ai/v1/verify/check \
  -H "Content-Type: application/json" \
  -d '{"domain":"nrlc.ai"}'
```

**Expected:** `{"status":"verified","method":"dns"}` or `{"status":"verified","method":"http"}`

### Step 4: Add Alternate Link to Page

Add to `<head>` of https://nrlc.ai:

```html
<link rel="alternate" 
      type="text/markdown" 
      href="https://md.croutons.ai/nrlc.ai/index.md">
```

### Step 5: Discover Page (Webhook)

```bash
curl -X POST https://precogs.croutons.ai/v1/discover \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "nrlc.ai",
    "page": "https://nrlc.ai"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "domain": "nrlc.ai",
  "page": "https://nrlc.ai",
  "alternate": "https://md.croutons.ai/nrlc.ai/index.md",
  "verification_method": "dns",
  "ingestion": {
    "doc_id": "...",
    "units_extracted": 150,
    "schema_coverage": 0.85,
    "hop_density": 0.42
  },
  "markdown_url": "https://md.croutons.ai/nrlc.ai/index.md",
  "message": "Page discovered and ingested. Atomic Croutons extracted and stored in graph."
}
```

## Automated Test Script

```bash
cd precogs/precogs-api
./scripts/test-nrlc-discovery.sh
```

## Manual Test Flow

1. **Verify domain:**
   ```bash
   curl -X POST https://precogs.croutons.ai/v1/verify/initiate \
     -H "Content-Type: application/json" \
     -d '{"domain":"nrlc.ai"}'
   ```

2. **Add DNS TXT or HTTP well-known file** (wait 2-5 min for DNS)

3. **Check verification:**
   ```bash
   curl -X POST https://precogs.croutons.ai/v1/verify/check \
     -H "Content-Type: application/json" \
     -d '{"domain":"nrlc.ai"}'
   ```

4. **Add `<link rel="alternate">` to nrlc.ai homepage**

5. **Discover:**
   ```bash
   curl -X POST https://precogs.croutons.ai/v1/discover \
     -H "Content-Type: application/json" \
     -d '{"domain":"nrlc.ai","page":"https://nrlc.ai"}'
   ```

## Test Scanner (Safety Net)

```bash
# Run scanner manually
curl https://precogs.croutons.ai/v1/scanner/run
```

This will:
- Scan all verified domains
- Check previously discovered pages
- Trigger discovery for new alternate links found

## What Gets Extracted

The `/v1/discover` endpoint automatically:
1. ✅ Verifies domain ownership
2. ✅ Fetches the page HTML
3. ✅ Confirms `<link rel="alternate">` exists
4. ✅ Calls `/v1/ingest` to extract atomic Croutons (units)
5. ✅ Stores factlets in graph
6. ✅ Returns ingestion results

**Atomic Croutons extracted:**
- Definition units
- Schema facts (from JSON-LD)
- FAQ units
- Claim units
- All following the Croutons Protocol (atomic, explicit, citeable)
