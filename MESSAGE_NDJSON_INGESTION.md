# Message to Croutons Dev Team – Local NDJSON Ingestion + Admin UI

**Subject:** NDJSON Ingestion Architecture + Admin Dashboard Requirements

---

Team,

I want to clarify how local service websites (for example, floodbarrierpros.com with https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson) should integrate into the Croutons / Precogs / Casa stack, and what admin tools we need.

---

## 1. Where NDJSON Feeds Belong

Directionally, I want the architecture to follow this rule:

- **Local service sites publish NDJSON** ("AI sitemaps")
- **Croutons ingests and normalizes** those streams
- **Precogs query Croutons** for home/local intelligence
- **Casa and HomeAdvisor AI sit on top** of Precogs

So for a URL like:
```
https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson
```

I want:

1. **Croutons ingestion service** to treat that as a source of factlets/flood-home data

2. **Ingested rows** to be normalized into the graph with tags such as:
   - `domain: "floodbarrierpros.com"`
   - `vertical: "flood_protection"` or `system: "flood_barrier"`
   - `region: <geo info if present>`

3. **Home-domain Precogs** (`home`, `home.safety`, possibly `home.flood`) to be able to query those factlets when:
   - The user's location matches the region
   - The domain is relevant (e.g., Casa is embedded on that partner's site)

**Key principle:**

Local NDJSON streams feed into Croutons. Casa and HomeAdvisor do not ingest those feeds directly; they only see them through Precogs.

---

## 2. Admin Dashboard Section for NDJSON Sources

I'd like an admin-level configuration view inside the Croutons/Graph admin where we can register and manage NDJSON sources for local services.

### Proposed "AI Sitemap Sources" Module

**Data model (per source):**
- `id` (internal)
- `partner_name` (e.g., "FloodBarrierPros")
- `domain` (e.g., floodbarrierpros.com)
- `ndjson_url` (e.g., https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson)
- `vertical` / `system` (e.g., flood_protection, hvac, siding)
- `region_hint` (optional: ZIP(s), city, state)
- `polling_interval` (e.g., 15m, 1h, 1d)
- `status` (active / paused)
- `last_fetch_at`
- `last_fetch_status` (success / error)
- `last_error_message` (if any)

**Admin UI capabilities:**
- Add new NDJSON source (form with fields above)
- Edit existing source (URL, vertical, region hints, polling interval)
- Toggle active/paused per source
- Manual "Fetch now / Test ingest" button per source
- "View last 50 factlets" preview for debugging (raw or pretty-printed)

**Ingestion behavior:**
- Background job that:
  - Iterates active sources
  - Fetches NDJSON
  - Validates document shape
  - Normalizes to home-domain factlets + triples
  - Attaches domain, vertical, and region tags
  - Errors surface in the admin UI (`last_fetch_status` and `last_error_message`)

---

## 3. How This Connects to Precogs and Casa

Once the NDJSON ingestion is wired:

- **Home-domain Precogs** (`home`, `home.safety`, `home.hvac`, etc.) should:
  - Be able to query Croutons for:
    - General home knowledge
    - Regional patterns
    - Partner-specific factlets (by domain/vertical/region)

- **Casa** (ourcasa.ai + embeds) and the **HomeAdvisor GPT**:
  - Continue to call `invoke_precog` only
  - Never talk directly to NDJSON URLs or to partner sites
  - Rely entirely on Croutons for localized, partner-aware recommendations

This keeps the architecture consistent with the unified brief:

- **Croutons** = ingestion + graph
- **Precogs** = oracle layer
- **Casa and HomeAdvisor AI** = faces/UX on top

---

## 4. What I Need From You

1. **Confirm** that this ingestion pattern (local NDJSON → Croutons → Precogs → Casa/HomeAdvisor) aligns with your intended design.

2. **Design and implement** the "AI Sitemap Sources" admin section with the fields and controls described above.

3. **Wire the ingestion job** that periodically pulls from these URLs and writes home-domain factlets/triples with domain + region tags.

4. **Expose whatever internal query hooks** Precogs needs so that `home.*` workers can filter/boost by domain/region/vertical.

Once this is in place, I can start onboarding more local service sites (beyond FloodBarrierPros) as NDJSON sources and let Casa/HomeAdvisor leverage that intelligence through Precogs.

---

That's the behavior I'm aiming for. Please let me know what adjustments you'd recommend or if you want to propose a different ingestion/registry design.

---

**Ready to send to Croutons dev team**

