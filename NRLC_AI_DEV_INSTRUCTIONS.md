# Croutons Protocol Integration Guide for nrlc.ai

**For:** nrlc.ai Development Team  
**Purpose:** Enable automatic discovery and ingestion of atomic Croutons from nrlc.ai pages  
**Status:** Ready for implementation

---

## Overview

The Croutons Protocol allows AI systems to discover, ingest, and cite atomic facts from your website. When you add a `<link rel="alternate">` tag, Croutons automatically:

1. Detects the tag
2. Extracts atomic facts (Croutons) from your pages
3. Generates canonical Markdown representations
4. Stores citeable facts in the knowledge graph
5. Makes them available for AI systems to discover and cite

**This requires zero changes to your CMS or content structure.** You just add one HTML tag.

---

## Integration Steps

### Step 1: Domain Verification (One-Time Setup)

**1.1 Initiate Verification**

Call the Croutons API to start verification:

```bash
curl -X POST https://precogs.croutons.ai/v1/verify/initiate \
  -H "Content-Type: application/json" \
  -d '{"domain":"nrlc.ai"}'
```

**Response:**
```json
{
  "domain": "nrlc.ai",
  "verification_token": "abc123def456...",
  "txt_record": "croutons-verification=abc123def456...",
  "instructions": {
    "step1": "Add this DNS TXT record to your domain:",
    "record": "croutons-verification=abc123def456...",
    "step2": "Wait 2-5 minutes for DNS propagation",
    "step3": "Call POST /v1/verify/check to confirm"
  }
}
```

**1.2 Add Verification (Choose ONE method)**

**Option A: DNS TXT Record (Recommended)**
- Add DNS TXT record: `croutons-verification=<token>`
- Wait 2-5 minutes for propagation

**Option B: HTTP Well-Known File (Fallback)**
- Create file: `https://nrlc.ai/.well-known/croutons-verification.txt`
- Content: Just the token (no quotes, no extra text)
- Make it publicly accessible (no auth required)

**1.3 Confirm Verification**

```bash
curl -X POST https://precogs.croutons.ai/v1/verify/check \
  -H "Content-Type: application/json" \
  -d '{"domain":"nrlc.ai"}'
```

**Expected:** `{"status":"verified","method":"dns"}` or `{"method":"http"}`

---

### Step 2: Add Alternate Link Tags (Per Page)

For each page you want Croutons to discover, add this to the `<head>` section:

```html
<link rel="alternate" 
      type="text/markdown" 
      href="https://md.croutons.ai/nrlc.ai/<path>.md">
```

**URL Pattern:**
- `https://md.croutons.ai/nrlc.ai/index.md` (for homepage)
- `https://md.croutons.ai/nrlc.ai/about.md` (for /about)
- `https://md.croutons.ai/nrlc.ai/services/geo.md` (for /services/geo)

**Path derivation:**
- Remove leading/trailing slashes
- Empty path = `index`
- Keep URL structure (e.g., `/services/geo` → `services/geo`)

**Example for Homepage:**

```html
<head>
  <!-- ... existing head content ... -->
  <link rel="alternate" 
        type="text/markdown" 
        href="https://md.croutons.ai/nrlc.ai/index.md">
</head>
```

**Example for /about page:**

```html
<head>
  <!-- ... existing head content ... -->
  <link rel="alternate" 
        type="text/markdown" 
        href="https://md.croutons.ai/nrlc.ai/about.md">
</head>
```

---

### Step 3: Trigger Discovery (After Adding Tags)

**Option A: Webhook (Recommended - Immediate)**

After adding the `<link rel="alternate">` tag, call the discovery webhook:

```bash
curl -X POST https://precogs.croutons.ai/v1/discover \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "nrlc.ai",
    "page": "https://nrlc.ai"
  }'
```

**What happens:**
1. ✅ Verifies domain ownership
2. ✅ Fetches page HTML
3. ✅ Confirms `<link rel="alternate">` exists
4. ✅ Extracts atomic Croutons (facts) from page
5. ✅ Stores in knowledge graph
6. ✅ Returns ingestion results

**Response:**
```json
{
  "ok": true,
  "domain": "nrlc.ai",
  "page": "https://nrlc.ai",
  "alternate": "https://md.croutons.ai/nrlc.ai/index.md",
  "verification_method": "dns",
  "ingestion": {
    "doc_id": "b00b370e348636ce",
    "units_extracted": 150,
    "schema_coverage": 0.85,
    "hop_density": 0.42
  },
  "markdown_url": "https://md.croutons.ai/nrlc.ai/index.md",
  "message": "Page discovered and ingested. Atomic Croutons extracted and stored in graph."
}
```

**Option B: Automatic Scanner (Safety Net)**

If you forget to call the webhook, Croutons runs a scheduled scanner that will discover new pages automatically (daily/weekly). No action needed, but webhook is faster.

---

## Implementation Examples

### PHP Template (if using PHP)

```php
<?php
// In your header template or base layout
$currentPath = $_SERVER['REQUEST_URI'] ?? '/';
$path = trim($currentPath, '/') ?: 'index';
$markdownUrl = "https://md.croutons.ai/nrlc.ai/{$path}.md";
?>
<link rel="alternate" type="text/markdown" href="<?php echo htmlspecialchars($markdownUrl); ?>">
```

### React/Next.js

```jsx
// In your _document.js or layout component
<Head>
  <link 
    rel="alternate" 
    type="text/markdown" 
    href={`https://md.croutons.ai/nrlc.ai${router.asPath === '/' ? '/index' : router.asPath}.md`}
  />
</Head>
```

### Static HTML

```html
<!-- Add to <head> of each page -->
<link rel="alternate" 
      type="text/markdown" 
      href="https://md.croutons.ai/nrlc.ai/index.md">
```

---

## What Gets Extracted

Croutons automatically extracts **atomic facts** (Croutons) from your pages:

- **Definition units** - Clear entity definitions
- **Schema facts** - From JSON-LD structured data
- **FAQ units** - Question/answer pairs
- **Claim units** - Verifiable statements

Each Crouton follows the [Croutons Protocol](https://croutons.ai/docs):
- One explicit claim
- One explicit subject
- Context-independent
- Citeable by AI systems

**Example extracted Crouton:**
```json
{
  "unit_id": "abc123",
  "unit_type": "fact",
  "clean_text": "Neural Command, LLC (Organization) name is Neural Command, LLC.",
  "unit_grounding": "schema",
  "unit_confidence": 0.95
}
```

---

## Testing Checklist

- [ ] Domain verification initiated
- [ ] DNS TXT or HTTP well-known file added
- [ ] Verification confirmed (`/v1/verify/check` returns `verified`)
- [ ] `<link rel="alternate">` tag added to page(s)
- [ ] Discovery webhook called (`/v1/discover`)
- [ ] Response shows `ok: true` and `units_extracted > 0`
- [ ] Markdown accessible at `https://md.croutons.ai/nrlc.ai/<path>.md`

---

## Troubleshooting

### Error: "Domain not verified"
- Check DNS TXT record exists: `dig TXT nrlc.ai`
- Or check HTTP file: `curl https://nrlc.ai/.well-known/croutons-verification.txt`
- Call `/v1/verify/check` again after DNS propagation (2-5 min)

### Error: "No <link rel="alternate"> tag found"
- Verify tag is in `<head>` section
- Check tag format: `rel="alternate"` and `type="text/markdown"`
- Ensure `href` points to `https://md.croutons.ai/nrlc.ai/...`

### Error: "Ingestion failed"
- Check page is publicly accessible
- Verify page has extractable content
- Review `fix_suggestions` in error response

### Low `units_extracted` count
- Add more structured content (JSON-LD schema)
- Ensure content has clear entity definitions
- Follow Croutons Protocol guidelines for atomic facts

---

## API Endpoints Reference

### Verification
- `POST /v1/verify/initiate` - Start verification, get token
- `POST /v1/verify/check` - Confirm verification

### Discovery
- `POST /v1/discover` - Webhook trigger (call after adding alternate link)
- `GET /v1/scanner/run` - Manual scanner trigger (safety net)

### Ingestion (Internal)
- `POST /v1/ingest` - Direct ingestion (used by discovery)

---

## Support

**API Base:** `https://precogs.croutons.ai`  
**Documentation:** See `TEST_DISCOVERY.md` for test examples  
**Protocol Spec:** See Croutons Protocol documentation

---

## Quick Start (Copy-Paste)

```bash
# 1. Verify domain (if not already done)
curl -X POST https://precogs.croutons.ai/v1/verify/initiate \
  -H "Content-Type: application/json" \
  -d '{"domain":"nrlc.ai"}'

# 2. Add DNS TXT: croutons-verification=<token>
# Wait 2-5 minutes

# 3. Check verification
curl -X POST https://precogs.croutons.ai/v1/verify/check \
  -H "Content-Type: application/json" \
  -d '{"domain":"nrlc.ai"}'

# 4. Add <link rel="alternate"> to page HTML

# 5. Discover page
curl -X POST https://precogs.croutons.ai/v1/discover \
  -H "Content-Type: application/json" \
  -d '{"domain":"nrlc.ai","page":"https://nrlc.ai"}'
```

---

**Status:** Ready for implementation  
**Last Updated:** 2026-01-25
