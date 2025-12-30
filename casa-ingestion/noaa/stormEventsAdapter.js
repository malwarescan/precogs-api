/**
 * Storm Events Adapter
 * 
 * Fetches severe weather events from NOAA Storm Events Database.
 * 
 * @module stormEventsAdapter
 */

const NoaaClient = require('./noaaClient');

// Storm event types mapping to our schema
const STORM_EVENT_MAPPING = {
    'Thunderstorm Wind': 'thunderstorm',
    'Tornado': 'tornado',
    'Hurricane': 'hurricane',
    'Tropical Storm': 'tropical_storm',
    'Hail': 'hail',
    'Flood': 'flood',
    'Flash Flood': 'flash_flood',
    'Winter Storm': 'winter_storm',
    'Ice Storm': 'ice_storm',
    'High Wind': 'high_wind',
    'Lightning': 'thunderstorm',
    'Heavy Rain': 'flood',
    'Heavy Snow': 'winter_storm'
};

// Magnitude to intensity mapping
const INTENSITY_MAPPING = {
    getIntensity(magnitude, damageProperty, damagesCrops) {
        const totalDamage = (damageProperty || 0) + (damagesCrops || 0);

        if (totalDamage > 10000000) return 'extreme';
        if (totalDamage > 1000000) return 'severe';
        if (totalDamage > 100000) return 'moderate';
        if (totalDamage > 0) return 'minor';

        // Use magnitude if available
        if (magnitude >= 4) return 'extreme';
        if (magnitude >= 3) return 'severe';
        if (magnitude >= 2) return 'moderate';
        if (magnitude >= 1) return 'minor';

        return 'none';
    }
};

class StormEventsAdapter {
    constructor(apiToken) {
        this.client = new NoaaClient(apiToken);
    }

    /**
     * Fetch storm events for a location and date range
     * 
     * Note: NOAA Storm Events uses a different API endpoint
     * This is a placeholder that would need the actual Storm Events API
     * 
     * @param {Object} params - Query parameters
     * @param {string} params.state - State code (e.g., 'FL')
     * @param {string} params.county - County name
     * @param {string} params.startDate - Start date (YYYY-MM-DD)
     * @param {string} params.endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Array>} Storm event records
     */
    async fetchEvents(params) {
        const {
            state,
            county,
            startDate,
            endDate
        } = params;

        if (!startDate || !endDate) {
            throw new Error('startDate and endDate are required');
        }

        console.log(`[storm-events] Fetching events for ${county}, ${state} from ${startDate} to ${endDate}`);

        // Note: Storm Events Database uses a different API structure
        // This would need to be adapted to the actual Storm Events API
        // For now, returning mock structure that matches expected format

        try {
            // Placeholder - would call actual Storm Events API
            const events = await this._fetchFromStormEventsAPI(params);

            console.log(`[storm-events] Fetched ${events.length} events`);

            return events.map(event => this._normalizeEvent(event));
        } catch (error) {
            console.error('[storm-events] Fetch error:', error.message);
            // Return empty array on error rather than failing
            return [];
        }
    }

    /**
     * Fetch events by ZIP code
     * 
     * @param {string} zip - ZIP code
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Promise<Array>} Storm events
     */
    async fetchByZip(zip, startDate, endDate) {
        // Would need to resolve ZIP to county/state first
        console.log(`[storm-events] Fetching events for ZIP ${zip}`);

        // Placeholder implementation
        return [];
    }

    /**
     * Normalize storm event to our schema format
     * 
     * @private
     * @param {Object} event - Raw storm event
     * @returns {Object} Normalized event
     */
    _normalizeEvent(event) {
        const eventType = STORM_EVENT_MAPPING[event.event_type] || 'other';
        const intensity = INTENSITY_MAPPING.getIntensity(
            event.magnitude,
            event.damage_property,
            event.damage_crops
        );

        return {
            date: event.begin_date || event.event_date,
            event_type: eventType,
            intensity: intensity,
            magnitude: event.magnitude || null,
            injuries: event.injuries_direct + event.injuries_indirect,
            deaths: event.deaths_direct + event.deaths_indirect,
            damage_property: event.damage_property || 0,
            damage_crops: event.damage_crops || 0,
            state: event.state,
            county: event.cz_name,
            lat: event.begin_lat,
            lon: event.begin_lon,
            narrative: event.event_narrative || ''
        };
    }

    /**
     * Placeholder for actual Storm Events API call
     * 
     * @private
     * @param {Object} params - Query parameters
     * @returns {Promise<Array>} Raw events
     */
    async _fetchFromStormEventsAPI(params) {
        // This would be replaced with actual Storm Events API integration
        // The Storm Events Database has a different API structure than CDO

        console.warn('[storm-events] Using placeholder API - implement actual Storm Events API');
        return [];
    }

    /**
     * Get client statistics
     * 
     * @returns {Object} Request statistics
     */
    getStats() {
        return this.client.getStats();
    }
}

module.exports = StormEventsAdapter;
