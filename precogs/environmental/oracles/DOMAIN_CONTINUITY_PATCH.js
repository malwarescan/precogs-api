/**
 * CASA Oracle Domain Continuity Fix
 * 
 * This patch adds session context management to prevent domain switching
 * during follow-up questions in active hazard scenarios.
 * 
 * Apply this to environmental_home_risk.js
 */

// Add after line 80 in the ask() method, before generating response:

// 2.5. Check for domain continuity (follow-up question detection)
const isFollowUp = this._isFollowUpQuestion(question, sessionContext);

let finalIntent = intent;
let lockedDomain = null;

if (isFollowUp && sessionContext.activeDomain) {
    // DOMAIN LOCKING: Maintain active domain for follow-ups
    console.log(`[oracle] Follow-up detected, locking to domain: ${sessionContext.activeDomain}`);
    finalIntent = { type: sessionContext.activeDomain, keywords: sessionContext.keywords || [] };
    lockedDomain = sessionContext.activeDomain;
}

// 4. Generate CASA-formatted response with domain continuity
const response = this._generateResponse(
    finalIntent,
    risks,
    maintenance,
    climateData,
    zip,
    home_context,
    sessionContext
);

// 5. Update session context
this._updateSessionContext(sessionId, {
    activeDomain: finalIntent.type,
    riskLevel: response.risk_level,
    keywords: finalIntent.keywords,
    lastQuestion: question,
    timestamp: Date.now()
});

// 6. Add session_id to response
response.session_id = sessionId;

return response;

// ============================================================
// NEW HELPER METHODS (add at end of class before closing brace)
// ============================================================

/**
 * Generate unique session ID
 * 
 * @private
 * @returns {string} Session ID
 */
_generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Get session context
 * 
 * @private
 * @param {string} sessionId - Session ID
 * @returns {Object} Session context
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
 * 
 * @private
 * @param {string} sessionId - Session ID
 * @param {Object} updates - Context updates
 */
_updateSessionContext(sessionId, updates) {
    const context = this.sessions.get(sessionId);
    if (context) {
        Object.assign(context, updates);
    }
}

/**
 * Detect if question is a follow-up
 * 
 * Follow-up indicators:
 * - Short questions (< 20 chars)
 * - Pronouns (who, what, when, where, how)
 * - Continuation words (so, and, but, also)
 * - No domain keywords
 * 
 * @private
 * @param {string} question - Current question
 * @param {Object} sessionContext - Session context
 * @returns {boolean} True if follow-up
 */
_isFollowUpQuestion(question, sessionContext) {
    if (!sessionContext.activeDomain) return false;

    const q = question.toLowerCase().trim();

    // Follow-up indicators
    const followUpPatterns = [
        /^(who|what|when|where|how|why)/,
        /^(so|and|but|also|plus|additionally)/,
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

/**
 * Enhanced _classifyQuestion with follow-up awareness
 * 
 * Add this logic to handle "who should I contact" type questions
 * within the context of an active domain
 */
_classifyQuestionWithContext(question, sessionContext) {
    const q = question.toLowerCase();

    // If asking about professionals/contact in active hazard scenario
    if (sessionContext.activeDomain && sessionContext.riskLevel === 'high') {
        if (q.match(/who|contact|call|hire|professional|contractor|company|help/)) {
            // Stay in active domain
            return {
                type: sessionContext.activeDomain,
                keywords: [...(sessionContext.keywords || []), 'professional', 'contact'],
                isFollowUp: true
            };
        }
    }

    // Otherwise use normal classification
    return this._classifyQuestion(question);
}

/**
 * Enhanced response generation with follow-up handling
 * 
 * Modify _floodRiskResponse to include professional contact info
 * when it's a follow-up about "who to contact"
 */
_floodRiskResponseWithFollowUp(risks, climateData, zip, isFollowUp, question) {
    const baseResponse = this._floodRiskResponse(risks, climateData, zip);

    // If follow-up asking about professionals
    if (isFollowUp && question.toLowerCase().match(/who|contact|call|hire|professional/)) {
        // Add professional contact steps at the top
        baseResponse.steps.unshift({
            action: 'Contact a licensed plumber immediately',
            priority: 'urgent',
            why: 'Active flooding requires immediate professional intervention'
        });

        baseResponse.steps.unshift({
            action: 'Call your insurance company',
            priority: 'urgent',
            why: 'Document damage and start claims process ASAP'
        });

        baseResponse.steps.unshift({
            action: 'If flooding is severe, call emergency services (911)',
            priority: 'urgent',
            why: 'Safety first—evacuate if water is rising'
        });

        // Update assessment to address the follow-up
        baseResponse.assessment = `For active flooding in ${zip}, here's who to contact immediately: ` + baseResponse.assessment;
    }

    return baseResponse;
}

module.exports = EnvironmentalHomeRiskOracle;
