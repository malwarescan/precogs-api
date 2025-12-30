/**
 * Crouton Emitter
 * 
 * Validates C-WNF records against environmental.local_climate:v1 schema,
 * generates canonical crouton IDs, and emits to Croutons Graph.
 * 
 * @module croutonEmitter
 */

const CWNFFactory = require('../CWNFFactory');
const crypto = require('crypto');

class CroutonEmitter {
    constructor(graphClient) {
        if (!graphClient) {
            throw new Error('Graph client is required');
        }
        this.graphClient = graphClient;
        this.quarantine = [];
        this.metrics = {
            attempted: 0,
            inserted: 0,
            failed: 0,
            quarantined: 0
        };
    }

    /**
     * Emit C-WNF records as croutons to the graph
     * 
     * @param {Array} cwnfArray - Array of C-WNF records
     * @returns {Promise<Object>} Emission results
     */
    async emitCroutons(cwnfArray) {
        const startTime = Date.now();

        console.log(`[emitter] Emitting ${cwnfArray.length} C-WNF records as croutons`);

        // Validate all records first
        const validated = this._validateBatch(cwnfArray);

        // Convert valid C-WNF records to crouton factlets
        const factlets = validated.valid.map(cwnf => this._cwnfToFactlet(cwnf));

        // Batch insert into graph
        let inserted = 0;
        let failed = 0;

        try {
            const result = await this._batchInsert(factlets);
            inserted = result.inserted;
            failed = result.failed;
        } catch (error) {
            console.error('[emitter] Batch insert error:', error.message);
            failed = factlets.length;
        }

        // Update metrics
        this.metrics.attempted += cwnfArray.length;
        this.metrics.inserted += inserted;
        this.metrics.failed += failed;
        this.metrics.quarantined += validated.invalid.length;

        const duration = Date.now() - startTime;

        const results = {
            attempted: cwnfArray.length,
            inserted,
            failed,
            quarantined: validated.invalid.length,
            duration,
            throughput: ((cwnfArray.length / duration) * 1000).toFixed(2) + ' records/sec'
        };

        console.log('[emitter] Results:', results);

        return results;
    }

    /**
     * Validate batch of C-WNF records
     * 
     * @private
     * @param {Array} cwnfArray - C-WNF records
     * @returns {Object} Validation results
     */
    _validateBatch(cwnfArray) {
        const valid = [];
        const invalid = [];

        cwnfArray.forEach((cwnf, index) => {
            const validation = CWNFFactory.validate(cwnf);

            if (validation.valid) {
                valid.push(cwnf);
            } else {
                console.warn(`[emitter] Invalid C-WNF record ${index}:`, validation.errors);
                invalid.push({
                    record: cwnf,
                    errors: validation.errors,
                    timestamp: new Date().toISOString()
                });
                this.quarantine.push(invalid[invalid.length - 1]);
            }
        });

        console.log(`[emitter] Validation: ${valid.length} valid, ${invalid.length} invalid`);

        return { valid, invalid };
    }

    /**
     * Convert C-WNF to crouton factlet
     * 
     * @private
     * @param {Object} cwnf - C-WNF record
     * @returns {Object} Crouton factlet
     */
    _cwnfToFactlet(cwnf) {
        // Generate canonical crouton ID
        const croutonId = this._generateCroutonId(cwnf);

        // Generate human-readable claim
        const claim = this._generateClaim(cwnf);

        // Build factlet
        return {
            '@type': 'Factlet',
            fact_id: croutonId,
            corpus_id: 'environmental.local_climate',
            page_id: 'environmental.local_climate',
            claim,
            normalized: cwnf
        };
    }

    /**
     * Generate canonical crouton ID
     * 
     * Format: env:climate:{location}:{date}:{source}
     * 
     * @private
     * @param {Object} cwnf - C-WNF record
     * @returns {string} Crouton ID
     */
    _generateCroutonId(cwnf) {
        const location = cwnf.zip || cwnf.county || `${cwnf.lat},${cwnf.lon}` || 'unknown';
        const date = cwnf.date;
        const source = cwnf.source.toLowerCase();

        // Create deterministic ID
        const baseId = `env:climate:${location}:${date}:${source}`;

        // Add hash for uniqueness if needed
        const hash = crypto.createHash('md5').update(baseId).digest('hex').substring(0, 8);

        return `${baseId}:${hash}`;
    }

    /**
     * Generate human-readable claim from C-WNF
     * 
     * @private
     * @param {Object} cwnf - C-WNF record
     * @returns {string} Claim text
     */
    _generateClaim(cwnf) {
        const parts = [];
        const location = cwnf.zip ? `ZIP ${cwnf.zip}` : (cwnf.county || 'Location');
        const date = new Date(cwnf.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        parts.push(`${location} on ${date}:`);

        // Temperature
        if (cwnf.temp_max !== null || cwnf.temp_min !== null) {
            if (cwnf.temp_max !== null && cwnf.temp_min !== null) {
                parts.push(`Temperature ranged from ${cwnf.temp_min.toFixed(1)}°F to ${cwnf.temp_max.toFixed(1)}°F.`);
            } else if (cwnf.temp_max !== null) {
                parts.push(`High temperature of ${cwnf.temp_max.toFixed(1)}°F.`);
            }
        }

        // Precipitation
        if (cwnf.precipitation !== null && cwnf.precipitation > 0) {
            parts.push(`Precipitation: ${cwnf.precipitation.toFixed(2)} inches.`);
        }

        // Storm event
        if (cwnf.storm_event && cwnf.storm_event !== 'none') {
            const intensity = cwnf.storm_intensity !== 'none' ? `${cwnf.storm_intensity} ` : '';
            parts.push(`${intensity}${cwnf.storm_event.replace('_', ' ')} activity reported.`);
        }

        // Humidity
        if (cwnf.humidity_index !== null) {
            parts.push(`Humidity: ${cwnf.humidity_index.toFixed(0)}%.`);
        }

        // Wind
        if (cwnf.wind_speed !== null && cwnf.wind_speed > 0) {
            parts.push(`Wind speed: ${cwnf.wind_speed.toFixed(1)} mph.`);
        }

        // Source attribution
        parts.push(`(Source: ${cwnf.source})`);

        return parts.join(' ');
    }

    /**
     * Batch insert factlets into graph
     * 
     * @private
     * @param {Array} factlets - Crouton factlets
     * @returns {Promise<Object>} Insert results
     */
    async _batchInsert(factlets) {
        if (factlets.length === 0) {
            return { inserted: 0, failed: 0 };
        }

        // Convert to NDJSON
        const ndjson = factlets.map(f => JSON.stringify(f)).join('\n') + '\n';

        try {
            // Send to graph service
            const response = await this.graphClient.ingest({
                corpus_id: 'environmental.local_climate',
                data: ndjson,
                format: 'ndjson'
            });

            return {
                inserted: response.records_inserted || 0,
                failed: factlets.length - (response.records_inserted || 0)
            };
        } catch (error) {
            console.error('[emitter] Graph insert error:', error.message);
            throw error;
        }
    }

    /**
     * Get quarantined records
     * 
     * @returns {Array} Quarantined records with errors
     */
    getQuarantined() {
        return this.quarantine;
    }

    /**
     * Get emission metrics
     * 
     * @returns {Object} Metrics summary
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.attempted > 0
                ? ((this.metrics.inserted / this.metrics.attempted) * 100).toFixed(2) + '%'
                : 'N/A',
            quarantineRate: this.metrics.attempted > 0
                ? ((this.metrics.quarantined / this.metrics.attempted) * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }

    /**
     * Clear quarantine
     */
    clearQuarantine() {
        this.quarantine = [];
        console.log('[emitter] Quarantine cleared');
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            attempted: 0,
            inserted: 0,
            failed: 0,
            quarantined: 0
        };
        console.log('[emitter] Metrics reset');
    }
}

module.exports = CroutonEmitter;
