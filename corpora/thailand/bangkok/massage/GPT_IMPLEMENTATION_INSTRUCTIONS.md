# GPT Implementation Instructions - Bangkok Massage Intelligence

**For:** GPT Development Team  
**Purpose:** Instructions for integrating GPT agents with the `bkk_massage` Precog

---

## Overview

The Bangkok Massage Intelligence Precog (`bkk_massage`) provides structured, safety-prioritized data about massage shops, districts, pricing, etiquette, and risk signals across Bangkok. GPT agents should use this Precog to answer questions about Bangkok massage services.

**Key Principle:** The GPT does NOT make safety or legitimacy decisions. It always calls the `bkk_massage` Precog for Bangkok massage queries and formats the results for the user.

---

## Function Definition Update

Add `bkk_massage` to the `precog` enum in your `invoke_precog` function:

```json
{
  "name": "invoke_precog",
  "description": "Invoke a Precogs oracle to analyze content using domain-specific knowledge. For Bangkok massage queries, use precog='bkk_massage' to get safety-verified shop recommendations, district information, pricing, and risk assessments.",
  "parameters": {
    "type": "object",
    "properties": {
      "precog": {
        "type": "string",
        "description": "Precog namespace to invoke",
        "enum": ["schema", "faq", "pricing", "home", "home.hvac", "home.plumbing", "home.electrical", "home.safety", "home.safety.mold", "home.flood", "bkk_massage"]
      },
      "content": {
        "type": "string",
        "description": "User's question or request. For bkk_massage, this should be the user's massage-related query (e.g., 'Where can I get a safe massage in Asok?', 'What are the prices in Nana?', 'Is this shop safe for solo female travelers?')"
      },
      "content_source": {
        "type": "string",
        "enum": ["inline", "url"],
        "default": "inline",
        "description": "Always use 'inline' for chat-based queries"
      },
      "task": {
        "type": "string",
        "description": "Task type. For bkk_massage, use: 'legitimacy_scoring' (default), 'district_aware_ranking', 'safety_pattern_recognition', 'price_sanity_checking'"
      },
      "region": {
        "type": "string",
        "description": "For bkk_massage, extract district from user query (e.g., 'Asok', 'Nana', 'Phrom Phong', 'Thonglor', 'Ekkamai', 'Silom', 'Ari', 'Victory Monument', 'Ratchada', 'Old City')"
      }
    },
    "required": ["precog", "content"]
  }
}
```

---

## System Prompt Addition

Add this section to your GPT system prompt for Bangkok massage queries:

```
**Bangkok Massage Intelligence (bkk_massage Precog):**

When users ask about massage services in Bangkok, you MUST call invoke_precog with:
- precog: "bkk_massage"
- content: User's full question about Bangkok massage
- content_source: "inline"
- task: Infer from user intent:
  - "legitimacy_scoring" - User asks if a shop is safe/legitimate
  - "district_aware_ranking" - User asks for recommendations in a district
  - "safety_pattern_recognition" - User asks about safety indicators
  - "price_sanity_checking" - User asks about pricing
- region: Extract district name from user message if mentioned (Asok, Nana, Phrom Phong, Thonglor, Ekkamai, Silom, Ari, Victory Monument, Ratchada, Old City)

**IMPORTANT Safety Rules:**
1. NEVER recommend shops from shops_risky.ndjson
2. ALWAYS prioritize shops with verified safety signals
3. For solo female travelers, ONLY recommend shops from female_safe_spaces.ndjson
4. Always mention district context and pricing norms
5. Warn users about common scam patterns if relevant
6. Emphasize safety signals (posted prices, visible reception, uniforms)

**Response Format:**
- Start with district context if user specified one
- List legitimate shops with safety signals
- Include pricing information (traditional vs oil massage)
- Mention safety indicators (franchise chains, posted menus, etc.)
- Warn about risk factors if user asks about specific areas
- For solo female travelers, explicitly state which shops are verified safe
```

---

## Example Queries and Responses

### Example 1: District Recommendation

**User:** "Where can I get a safe massage in Asok?"

**GPT Action:**
```json
{
  "precog": "bkk_massage",
  "content": "Where can I get a safe massage in Asok?",
  "content_source": "inline",
  "task": "district_aware_ranking",
  "region": "Asok"
}
```

**Expected Precog Response (NDJSON format):**
```json
{
  "assessment": "Asok is a modern business district with high safety standards",
  "shops": [
    {
      "name": "Health Land Asok",
      "legit": true,
      "price_traditional": 400,
      "price_oil": 650,
      "safety_signals": ["uniforms", "open_storefront", "posted_menu", "visible_reception", "professional_branding", "franchise_chains"],
      "verified_safe_female": true
    },
    {
      "name": "Let's Relax Asok",
      "legit": true,
      "price_traditional": 450,
      "price_oil": 700,
      "safety_signals": ["uniforms", "open_storefront", "posted_menu", "visible_reception", "professional_branding", "franchise_chains"],
      "verified_safe_female": true
    }
  ],
  "district_info": {
    "safety_at_night": "good",
    "risk_level": "low",
    "price_average_traditional": 450,
    "price_average_oil": 700
  }
}
```

**GPT Formatted Response:**
```
Asok is a modern business district with excellent safety standards. Here are verified safe massage options:

**Health Land Asok** (Franchise Chain)
- Traditional Thai: 400 THB | Oil: 650 THB
- Hours: 10:00-24:00
- Safety: Professional uniforms, posted menu, visible reception
- Verified safe for solo female travelers

**Let's Relax Asok** (Premium Chain)
- Traditional Thai: 450 THB | Oil: 700 THB
- Hours: 10:00-22:00
- Safety: Premium facilities, excellent safety record
- Verified safe for solo female travelers

Both shops are part of well-known chains with consistent service quality and bright, street-facing entrances.
```

### Example 2: Solo Female Traveler Query

**User:** "I'm traveling alone in Bangkok. Where is safe for a massage?"

**GPT Action:**
```json
{
  "precog": "bkk_massage",
  "content": "I'm traveling alone in Bangkok. Where is safe for a massage?",
  "content_source": "inline",
  "task": "district_aware_ranking"
}
```

**GPT Formatted Response:**
```
For solo female travelers, I recommend these verified safe options:

**Premium Districts (Highest Safety):**
- **Phrom Phong:** Health Land Phrom Phong, Asia Herb Association
- **Thonglor:** Divana Massage & Spa, Coran Boutique Spa
- **Asok:** Health Land Asok, Let's Relax Asok

**Key Safety Indicators to Look For:**
- Posted menu with clear prices
- Visible reception desk
- Professional uniforms
- Street-facing entrance (not in alley)
- Franchise chains (Health Land, Let's Relax)

**Avoid:**
- Shops with unlisted pricing
- Dark or hidden entrances
- Aggressive street touts
- Shops without visible reception

All recommended shops above are verified safe for solo female travelers with excellent safety records.
```

### Example 3: Pricing Query

**User:** "What should I expect to pay for a massage in Nana?"

**GPT Action:**
```json
{
  "precog": "bkk_massage",
  "content": "What should I expect to pay for a massage in Nana?",
  "content_source": "inline",
  "task": "price_sanity_checking",
  "region": "Nana"
}
```

**GPT Formatted Response:**
```
In Nana district, typical pricing ranges:

**Traditional Thai Massage:**
- Normal range: 300-450 THB
- Typical: 350 THB

**Oil Massage:**
- Normal range: 500-700 THB
- Typical: 550 THB

**Important Notes:**
- Nana is a tourist-heavy area with wide price variation
- Always verify prices are posted before entering
- Be cautious of shops quoting much lower prices (common scam pattern)
- Legitimate shops will have prices clearly displayed

**Recommended Shops in Nana:**
- Baan Sabai Nana: 350 THB traditional, 550 THB oil (verified safe)
- Urban Retreat Nana: 400 THB traditional, 650 THB oil (verified safe)

If a shop quotes prices significantly outside these ranges or doesn't have posted prices, consider it a red flag.
```

---

## Safety-First Guidelines

1. **Never recommend risky shops** - Only use data from `shops_legit.ndjson`
2. **Prioritize safety signals** - Always mention key safety indicators
3. **Warn about scam patterns** - Alert users to common risk factors
4. **District context matters** - Include district safety and character info
5. **Solo female travelers** - Only recommend from `female_safe_spaces.ndjson`
6. **Price transparency** - Emphasize importance of posted prices

---

## Response Formatting Guidelines

1. **Start with context** - District info, safety level, price norms
2. **List shops clearly** - Name, prices, safety signals, hours
3. **Highlight safety** - Emphasize verified safe spaces for solo travelers
4. **Include warnings** - Mention risk factors when relevant
5. **Provide etiquette** - Brief tips on tipping, clothing, communication

---

## Testing Checklist

- [ ] Function definition includes `bkk_massage` in enum
- [ ] System prompt includes Bangkok massage section
- [ ] District extraction works (10 districts)
- [ ] Task selection works (4 tasks)
- [ ] Solo female traveler queries return only verified safe shops
- [ ] Pricing queries return district-appropriate ranges
- [ ] Safety warnings appear for risky areas
- [ ] Response formatting is clear and safety-focused

---

## Questions?

Refer to:
- `corpus_manifest.json` for schema details
- `README.md` for corpus documentation
- `DELIVERY_SUMMARY.md` for corpus statistics

---

**Ready for GPT integration!**

