# DOMAIN CONTINUITY FIX - IMPLEMENTATION GUIDE

**Priority:** HIGH  
**Issue:** Oracle switches domains during follow-up questions in active hazard scenarios  
**Status:** Fix ready for implementation

────────────────────────────────────────────────────────────────

## Problem Statement

**Example Failure:**
1. User: "My home is flooding, what can I do?"
   → Oracle: HIGH risk, urgent flood guidance ✅
2. User: "So who should I contact?"
   → Oracle: LOW risk, HVAC/hurricane/general advice ❌

**Root Cause:**  
No session context between questions. Each question is classified independently.

────────────────────────────────────────────────────────────────

## Solution Overview

Implement **5 key features**:

1. **Domain Locking** - Active hazard domain persists across follow-ups
2. **Triage Continuity** - HIGH/urgent status inherited by follow-ups
3. **Intent Routing Fix** - Follow-ups route to active domain
4. **Session Context** - Maintain conversation state
5. **Follow-Up Detection** - Identify continuation questions

────────────────────────────────────────────────────────────────

## Implementation Steps

### Step 1: Add Session Management to Constructor

**File:** `/precogs/environmental/oracles/environmental_home_risk.js`  
**Location:** Lines 16-20

```javascript
class EnvironmentalHomeRiskOracle {
    constructor(graphClient) {
        this.graphClient = graphClient;
        // ADD THIS:
        this.sessions = new Map(); // Session context storage
    }
```

### Step 2: Update ask() Method Signature

**Location:** Lines 36-41

**BEFORE:**
```javascript
async ask(request) {
    const { question, zip, home_context = {} } = request;
```

**AFTER:**
```javascript
async ask(request) {
    const { question, zip, home_context = {}, session_id } = request;
    
    // Get or create session context
    const sessionId = session_id || this._generateSessionId();
    const sessionContext = this._getSessionContext(sessionId);
```

### Step 3: Add Follow-Up Detection

**Location:** After line 64 (after intent classification)

```javascript
// 2. Classify question intent
const intent = this._classifyQuestion(question);

// ADD THIS BLOCK:
// 2.5. Check for domain continuity (follow-up detection)
const isFollowUp = this._isFollowUpQuestion(question, sessionContext);

let finalIntent = intent;

if (isFollowUp && sessionContext.activeDomain) {
    // DOMAIN LOCKING: Maintain active domain for follow-ups
    console.log(`[oracle] Follow-up detected, locking to domain: ${sessionContext.activeDomain}`);
    finalIntent = {
        type: sessionContext.activeDomain,
        keywords: sessionContext.keywords || [],
        isFollowUp: true
    };
}
```

### Step 4: Update Response Generation

**Location:** Line 80 (response generation)

**BEFORE:**
```javascript
return this._generateResponse(intent, risks, maintenance, climateData, zip, home_context);
```

**AFTER:**
```javascript
const response = this._generateResponse(
    finalIntent,  // Use finalIntent instead of intent
    risks,
    maintenance,
    climateData,
    zip,
    home_context,
    sessionContext  // Pass session context
);

// Update session context
this._updateSessionContext(sessionId, {
    activeDomain: finalIntent.type,
    riskLevel: response.risk_level,
    keywords: finalIntent.keywords,
    lastQuestion: question,
    timestamp: Date.now()
});

// Add session_id to response
response.session_id = sessionId;

return response;
```

### Step 5: Add Helper Methods

**Location:** End of class (before closing brace, around line 840)

```javascript
/**
 * Generate unique session ID
 */
_generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Get session context
 */
_getSessionContext(sessionId) {
    if (!this.sessions.has(sessionId)) {
        this.sessions.set(sessionId, {
            activeDomain: null,
            riskLevel: null,
            keywords: [],
            lastQuestion: null,
            timestamp: Date.now()
        });
    }

    // Clean old sessions (older than 1 hour)
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    for (const [id, context] of this.sessions.entries()) {
        if (now - context.timestamp > oneHour) {
            this.sessions.delete(id);
        }
    }

    return this.sessions.get(sessionId);
}

/**
 * Update session context
 */
_updateSessionContext(sessionId, updates) {
    const context = this.sessions.get(sessionId);
    if (context) {
        Object.assign(context, updates);
    }
}

/**
 * Detect if question is a follow-up
 */
_isFollowUpQuestion(question, sessionContext) {
    if (!sessionContext.activeDomain) return false;

    const q = question.toLowerCase().trim();

    // Follow-up indicators
    const followUpPatterns = [
        /^(who|what|when|where|how|why)/,
        /^(so|and|but|also|plus)/,
        /^(should i|can i|do i|will i)/,
        /(contact|call|hire|professional|contractor|company)/,
        /^(what about|how about|tell me)/
    ];

    // Check for follow-up patterns
    const hasFollowUpPattern = followUpPatterns.some(pattern => pattern.test(q));

    // Check if question is short (likely a follow-up)
    const isShort = q.length < 30;

    // Check if question lacks domain keywords
    const hasDomainKeywords = this._classifyQuestion(question).type !== 'general_assessment';

    // It's a follow-up if:
    // 1. Has follow-up pattern, OR
    // 2. Is short AND lacks domain keywords
    return hasFollowUpPattern || (isShort && !hasDomainKeywords);
}
```

### Step 6: Enhance Flood Response for Follow-Ups

**Location:** Modify `_floodRiskResponse` method (around line 556)

**Add at beginning of method:**

```javascript
_floodRiskResponse(risks, climateData, zip, sessionContext = {}) {
    const riskLevel = this._getRiskLevel(risks.flood_risk);
    const precipTotal = climateData.reduce((sum, d) => sum + (d.precipitation || 0), 0);
    const stormEvents = climateData.filter(d =>
        d.storm_event === 'flood' ||
        d.storm_event === 'flash_flood' ||
        d.storm_intensity === 'severe'
    ).length;

    // ADD THIS: Check if this is a follow-up about professionals
    const isContactFollowUp = sessionContext.isFollowUp &&
        sessionContext.lastQuestion &&
        sessionContext.lastQuestion.toLowerCase().match(/who|contact|call|hire|professional/);

    let assessment, causes, steps;

    if (isContactFollowUp && riskLevel === 'high') {
        // URGENT PROFESSIONAL CONTACT RESPONSE
        assessment = `For active flooding in ${zip}, here's who to contact immediately:`;

        causes = [
            'Flooding requires immediate professional intervention',
            'Insurance claims must be started quickly',
            'Safety is the top priority'
        ];

        steps = [
            {
                action: 'If flooding is severe, call 911',
                priority: 'urgent',
                why: 'Safety first—evacuate if water is rising rapidly'
            },
            {
                action: 'Call your homeowners insurance company',
                priority: 'urgent',
                why: 'Document damage and start claims process immediately'
            },
            {
                action: 'Contact a licensed water damage restoration company',
                priority: 'urgent',
                why: 'Professional water extraction prevents mold and structural damage'
            },
            {
                action: 'Hire a licensed plumber if flooding is from pipes',
                priority: 'urgent',
                why: 'Stop the source before addressing water damage'
            },
            {
                action: 'Document everything with photos/video',
                priority: 'high',
                why: 'Evidence is critical for insurance claims'
            }
        ];
    } else {
        // NORMAL FLOOD RISK RESPONSE (existing code)
        assessment = `${zip} has ${riskLevel} flood risk...`;
        // ... rest of existing code
    }

    return {
        assessment,
        risk_score: risks.flood_risk,
        risk_level: riskLevel,
        causes,
        steps,
        follow_up: isContactFollowUp ? [
            'What should I do while waiting for help?',
            'How do I document damage for insurance?',
            'What can I do to prevent future flooding?'
        ] : [
            'Do I need flood insurance?',
            'How can I improve drainage?',
            'What are signs of foundation water damage?'
        ],
        data_summary: {
            location: zip,
            records_analyzed: climateData.length,
            confidence: this._getConfidence(climateData.length)
        }
    };
}
```

### Step 7: Update _generateResponse Signature

**Location:** Line 149

**BEFORE:**
```javascript
_generateResponse(intent, risks, maintenance, climateData, zip, homeContext) {
```

**AFTER:**
```javascript
_generateResponse(intent, risks, maintenance, climateData, zip, homeContext, sessionContext = {}) {
```

**Update all response method calls to pass sessionContext:**

```javascript
case 'flood_risk':
    return this._floodRiskResponse(risks, climateData, zip, sessionContext);
```

────────────────────────────────────────────────────────────────

## Testing

### Test Case 1: Flood Follow-Up

**Request 1:**
```json
{
  "question": "My home is flooding, what can I do?",
  "zip": "33907"
}
```

**Expected Response 1:**
- `risk_level`: "high"
- `session_id`: "session_xxx"
- Steps include immediate flood response

**Request 2:**
```json
{
  "question": "So who should I contact?",
  "zip": "33907",
  "session_id": "session_xxx"  // Same session ID
}
```

**Expected Response 2:**
- `risk_level`: "high" (inherited)
- Domain: flood_risk (locked)
- Steps include:
  - Call 911 if severe
  - Call insurance
  - Contact water damage restoration
  - Hire plumber

### Test Case 2: Domain Pivot

**Request 1:**
```json
{
  "question": "Should I worry about mold?",
  "zip": "33907"
}
```

**Request 2:**
```json
{
  "question": "What about my roof?",  // Explicit pivot
  "zip": "33907",
  "session_id": "session_xxx"
}
```

**Expected:** Domain switches to roof_risk (explicit pivot detected)

────────────────────────────────────────────────────────────────

## API Contract Update

### Request Schema (Updated)

```javascript
{
  "question": string (required),
  "zip": string (required),
  "home_context": object (optional),
  "session_id": string (optional)  // NEW: For conversation continuity
}
```

### Response Schema (Updated)

```javascript
{
  "assessment": string,
  "risk_score": number | null,
  "risk_level": string | null,
  "causes": string[],
  "steps": [...],
  "follow_up": string[],
  "data_summary": {...},
  "session_id": string  // NEW: Return session ID for next request
}
```

────────────────────────────────────────────────────────────────

## Verification Checklist

After implementing:

- [ ] Session context persists across requests
- [ ] Follow-up questions maintain domain
- [ ] HIGH risk level inherited by follow-ups
- [ ] "Who should I contact?" routes to active domain
- [ ] Professional contact info provided for urgent scenarios
- [ ] Explicit topic changes (e.g., "What about my roof?") switch domains
- [ ] Old sessions cleaned up (1 hour TTL)
- [ ] session_id returned in all responses
- [ ] Test cases pass

────────────────────────────────────────────────────────────────

## Files Modified

1. `/precogs/environmental/oracles/environmental_home_risk.js`
   - Add session management
   - Add follow-up detection
   - Enhance flood response
   - Update all response methods

2. `/graph-service/routes/casa-oracle.js`
   - Pass session_id from request to oracle
   - Return session_id in response

────────────────────────────────────────────────────────────────

## Rollback Plan

If issues occur:

```bash
cp /Users/malware/Desktop/croutons.ai/precogs/environmental/oracles/environmental_home_risk.js.backup \
   /Users/malware/Desktop/croutons.ai/precogs/environmental/oracles/environmental_home_risk.js
```

────────────────────────────────────────────────────────────────

**Status:** Ready for implementation  
**Priority:** HIGH  
**ETA:** 2-3 hours  
**Testing Required:** Yes (see test cases above)

────────────────────────────────────────────────────────────────
