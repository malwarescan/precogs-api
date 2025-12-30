# Connected Partners Only - Implementation Complete

**Date:** December 2024  
**Status:** ✅ Implemented

---

## What Changed

Precogs now **ONLY** recommends and returns data from companies that are connected to the API via NDJSON feeds.

---

## How It Works

### Partner Registry

Partners are registered in `getConnectedPartners()` function:

```javascript
const partners = {
  "flood_protection": [
    {
      domain: "floodbarrierpros.com",
      name: "FloodBarrierPros",
      ndjson_url: "https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson",
      regions: ["FL", "Florida", "Fort Myers", "Naples", "Miami", "Tampa", "Orlando"],
    },
  ],
  // Add more verticals as partners are added
};
```

### Filtering Logic

1. **Factlet Filtering:** Only factlets from connected partner domains are used
2. **Cost Data:** Only cost data from connected partners is returned
3. **Partner Recommendations:** Only connected partners are listed in responses
4. **No Generic Estimates:** If no connected partner data exists, cost_band is null (not generic estimate)

---

## Response Format

### With Connected Partner Data

```json
{
  "assessment": "...",
  "risk_score": 0.75,
  "cost_band": "$1,200-$5,600",
  "when": "April-May (before hurricane season)",
  "recommended_partner": {
    "name": "FloodBarrierPros",
    "domain": "floodbarrierpros.com"
  },
  "connected_partners": [
    {
      "name": "FloodBarrierPros",
      "domain": "floodbarrierpros.com"
    }
  ]
}
```

### Without Connected Partner Data

```json
{
  "assessment": "...",
  "risk_score": 0.75,
  "cost_band": null,
  "message": "Cost data not available for this location from connected partners.",
  "connected_partners": []
}
```

---

## Example: Cost Question

### User Input
```
"How much would a flood barrier cost in Fort Myers?"
```

### Precogs Response
```json
{
  "cost_band": "$1,200-$5,600",
  "partner": {
    "name": "FloodBarrierPros",
    "domain": "floodbarrierpros.com"
  },
  "connected_partners": [
    {
      "name": "FloodBarrierPros",
      "domain": "floodbarrierpros.com"
    }
  ]
}
```

### GPT Formatted Response
```
Based on Fort Myers, FL, flood barrier installation typically costs **$1,200-$5,600**.

This estimate comes from **FloodBarrierPros**, our connected partner in your area. They have location-specific pricing data for Fort Myers.

**Available Partner:**
• FloodBarrierPros (floodbarrierpros.com)

Would you like help connecting with them?
```

---

## Adding New Partners

To add a new partner:

1. **Add to `getConnectedPartners()`:**
```javascript
"hvac": [
  {
    domain: "example-hvac.com",
    name: "Example HVAC",
    ndjson_url: "https://example-hvac.com/sitemaps/sitemap-ai.ndjson",
    regions: ["FL", "TX", "CA"],
  },
],
```

2. **Add to `getNDJSONUrlForDomain()`:**
```javascript
const domainMap = {
  "floodbarrierpros.com": "https://floodbarrierpros.com/sitemaps/sitemap-ai.ndjson",
  "example-hvac.com": "https://example-hvac.com/sitemaps/sitemap-ai.ndjson",
};
```

3. **Deploy** - Partners will automatically be included in responses

---

## Benefits

✅ **Quality Control:** Only recommend verified, connected partners  
✅ **Data Accuracy:** Cost/timing data only from partners with NDJSON feeds  
✅ **Transparency:** Users know exactly which companies are available  
✅ **Scalable:** Easy to add new partners as they connect

---

## GPT Instructions Updated

The GPT instructions now specify:
- Only recommend companies in `connected_partners` list
- Mention `recommended_partner` if present
- Never recommend companies not connected to the API

---

## Status

✅ **Code Updated:** `homePrecog.js` filters to connected partners only  
✅ **GPT Instructions Updated:** `HOMEADVISOR_AI_GPT_INSTRUCTIONS.md`  
✅ **Partner Registry:** `getConnectedPartners()` function ready for expansion

**Ready for production!** All responses now only include connected partners.




