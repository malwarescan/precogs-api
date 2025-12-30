/**
 * GHCND to C-WNF Normalizer
 * 
 * Converts GHCND (Global Historical Climatology Network - Daily) data
 * to CASA Weather Normal Form.
 * 
 * @module ghcndToCwnf
 */

const CWNFFactory = require('../CWNFFactory');

class GhcndToCwnf {
    /**
     * Convert GHCND record to C-WNF
     * 
     * @param {Object} ghcndRecord - GHCND record grouped by date
     * @param {Object} locationData - Location metadata (zip, lat, lon, county)
     * @returns {Object} C-WNF record
     */
    static normalize(ghcndRecord, locationData = {}) {
        const datatype = ghcndRecord.datatype || {};

        // Convert temperatures from tenths of degrees C to Fahrenheit
        const temp_max = this._convertTemp(datatype.TMAX);
        const temp_min = this._convertTemp(datatype.TMIN);
        const temp_avg = this._convertTemp(datatype.TAVG);

        // Convert precipitation from tenths of mm to inches
        const precipitation = this._convertPrecip(datatype.PRCP);

        // Wind speed from tenths of m/s to mph
        const wind_speed = this._convertWindSpeed(datatype.AWND);

        // Derive dew point from temperature and humidity if available
        // For now, use null if not directly available
        const dew_point = null;

        // Derive humidity index (not directly available in GHCND)
        const humidity_index = null;

        // Determine if there was a storm based on precipitation
        const storm_event = this._deriveStormEvent(precipitation, wind_speed);
        const storm_intensity = this._deriveStormIntensity(precipitation, wind_speed);

        // UV proxy (not available in GHCND)
        const uv_proxy = 'unknown';

        // Calculate seasonality vector
        const seasonality_vector = this._calculateSeasonality(ghcndRecord.date);

        // Build C-WNF record
        return CWNFFactory.create({
            date: ghcndRecord.date,
            temp_max,
            temp_min,
            dew_point,
            precipitation,
            humidity_index,
            wind_speed,
            storm_event,
            storm_intensity,
            uv_proxy,
            seasonality_vector,
            zip: locationData.zip || null,
            lat: locationData.lat || null,
            lon: locationData.lon || null,
            county: locationData.county || null,
            source: 'GHCND',
            station_id: ghcndRecord.station || null,
            data_quality: this._determineQuality(ghcndRecord.attributes)
        });
    }

    /**
     * Convert temperature from tenths of degrees C to Fahrenheit
     * 
     * @private
     * @param {number} value - Temperature in tenths of degrees C
     * @returns {number|null} Temperature in Fahrenheit
     */
    static _convertTemp(value) {
        if (value === null || value === undefined) return null;
        // Convert tenths of C to C, then to F
        const celsius = value / 10;
        return (celsius * 9 / 5) + 32;
    }

    /**
     * Convert precipitation from tenths of mm to inches
     * 
     * @private
     * @param {number} value - Precipitation in tenths of mm
     * @returns {number|null} Precipitation in inches
     */
    static _convertPrecip(value) {
        if (value === null || value === undefined) return null;
        // Convert tenths of mm to mm, then to inches
        const mm = value / 10;
        return mm / 25.4;
    }

    /**
     * Convert wind speed from tenths of m/s to mph
     * 
     * @private
     * @param {number} value - Wind speed in tenths of m/s
     * @returns {number|null} Wind speed in mph
     */
    static _convertWindSpeed(value) {
        if (value === null || value === undefined) return null;
        // Convert tenths of m/s to m/s, then to mph
        const ms = value / 10;
        return ms * 2.237;
    }

    /**
     * Derive storm event from precipitation and wind
     * 
     * @private
     * @param {number} precip - Precipitation in inches
     * @param {number} wind - Wind speed in mph
     * @returns {string} Storm event type
     */
    static _deriveStormEvent(precip, wind) {
        if (wind && wind > 40) return 'high_wind';
        if (precip && precip > 2) return 'flood';
        if (precip && precip > 0.5) return 'thunderstorm';
        return 'none';
    }

    /**
     * Derive storm intensity from precipitation and wind
     * 
     * @private
     * @param {number} precip - Precipitation in inches
     * @param {number} wind - Wind speed in mph
     * @returns {string} Storm intensity
     */
    static _deriveStormIntensity(precip, wind) {
        if ((wind && wind > 60) || (precip && precip > 4)) return 'severe';
        if ((wind && wind > 40) || (precip && precip > 2)) return 'moderate';
        if ((wind && wind > 25) || (precip && precip > 0.5)) return 'minor';
        return 'none';
    }

    /**
     * Calculate seasonality vector from date
     * 
     * @private
     * @param {string} date - ISO date (YYYY-MM-DD)
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
            climate_zone: 'unknown' // Would need location lookup
        };
    }

    /**
     * Get day of year from date
     * 
     * @private
     * @param {Date} date - Date object
     * @returns {number} Day of year (1-366)
     */
    static _getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }

    /**
     * Determine data quality from GHCND attributes
     * 
     * @private
     * @param {string} attributes - GHCND quality attributes
     * @returns {string} Quality level
     */
    static _determineQuality(attributes) {
        if (!attributes) return 'verified';
        if (attributes.includes('F')) return 'suspect'; // Failed quality check
        if (attributes.includes('E')) return 'estimated';
        return 'verified';
    }

    /**
     * Batch normalize GHCND records
     * 
     * @param {Array} ghcndRecords - Array of GHCND records
     * @param {Object} locationData - Location metadata
     * @returns {Array} Array of C-WNF records
     */
    static normalizeBatch(ghcndRecords, locationData = {}) {
        return ghcndRecords.map(record => {
            try {
                return this.normalize(record, locationData);
            } catch (error) {
                console.error(`[ghcnd-normalizer] Error normalizing record for ${record.date}:`, error.message);
                return null;
            }
        }).filter(Boolean);
    }
}

module.exports = GhcndToCwnf;
