/**
 * Storm Events to C-WNF Normalizer
 * 
 * Converts NOAA Storm Events Database records to CASA Weather Normal Form.
 * 
 * @module stormEventsToCwnf
 */

const CWNFFactory = require('../CWNFFactory');

class StormEventsToCwnf {
    /**
     * Convert Storm Event to C-WNF
     * 
     * @param {Object} stormEvent - Storm event record
     * @param {Object} locationData - Location metadata
     * @returns {Object} C-WNF record
     */
    static normalize(stormEvent, locationData = {}) {
        // Storm events don't have temperature/precipitation data
        // They supplement other datasets with event information

        return CWNFFactory.create({
            date: stormEvent.date,
            temp_max: null,
            temp_min: null,
            dew_point: null,
            precipitation: null,
            humidity_index: null,
            wind_speed: null,
            storm_event: stormEvent.event_type || 'other',
            storm_intensity: stormEvent.intensity || 'none',
            uv_proxy: 'unknown',
            seasonality_vector: this._calculateSeasonality(stormEvent.date),
            zip: locationData.zip || null,
            lat: stormEvent.lat || locationData.lat || null,
            lon: stormEvent.lon || locationData.lon || null,
            county: stormEvent.county || locationData.county || null,
            source: 'StormEvents',
            station_id: null,
            data_quality: 'verified'
        });
    }

    /**
     * Calculate seasonality vector
     * 
     * @private
     * @param {string} date - ISO date
     * @returns {Object} Seasonality vector
     */
    static _calculateSeasonality(date) {
        const d = new Date(date);
        const month = d.getMonth() + 1;
        const dayOfYear = this._getDayOfYear(d);

        let season;
        if (month >= 3 && month <= 5) season = 'spring';
        else if (month >= 6 && month <= 8) season = 'summer';
        else if (month >= 9 && month <= 11) season = 'fall';
        else season = 'winter';

        return {
            season,
            month,
            day_of_year: dayOfYear,
            climate_zone: 'unknown'
        };
    }

    /**
     * Get day of year
     * 
     * @private
     * @param {Date} date - Date object
     * @returns {number} Day of year
     */
    static _getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }

    /**
     * Batch normalize storm events
     * 
     * @param {Array} stormEvents - Array of storm event records
     * @param {Object} locationData - Location metadata
     * @returns {Array} Array of C-WNF records
     */
    static normalizeBatch(stormEvents, locationData = {}) {
        return stormEvents.map(event => {
            try {
                return this.normalize(event, locationData);
            } catch (error) {
                console.error(`[storm-events-normalizer] Error normalizing event:`, error.message);
                return null;
            }
        }).filter(Boolean);
    }
}

module.exports = StormEventsToCwnf;
