/**
 * CASA Weather Normal Form (C-WNF) Factory
 * 
 * Defines the strict intermediate format that all NOAA datasets convert into
 * before becoming croutons. This is the "truth intermediate" layer.
 * 
 * C-WNF must match environmental.local_climate:v1 schema exactly.
 * 
 * @module CWNFFactory
 */

class CWNFFactory {
    /**
     * Create a C-WNF record from normalized data
     * 
     * @param {Object} data - Normalized climate data
     * @returns {Object} C-WNF record
     */
    static create(data) {
        // All fields must be present, use null for missing values
        const cwnf = {
            // Temperature data (Fahrenheit)
            temp_max: this._toFloat(data.temp_max),
            temp_min: this._toFloat(data.temp_min),
            dew_point: this._toFloat(data.dew_point),

            // Precipitation and atmospheric
            precipitation: this._toFloat(data.precipitation),
            humidity_index: this._toFloat(data.humidity_index),
            wind_speed: this._toFloat(data.wind_speed),

            // Storm data
            storm_event: this._toString(data.storm_event) || 'none',
            storm_intensity: this._toString(data.storm_intensity) || 'none',
            uv_proxy: this._toString(data.uv_proxy) || 'unknown',

            // Seasonal context
            seasonality_vector: this._toObject(data.seasonality_vector),

            // Required fields
            date: this._toISODate(data.date),
            source: this._toString(data.source),

            // Location data
            zip: this._toString(data.zip),
            lat: this._toFloat(data.lat),
            lon: this._toFloat(data.lon),
            county: this._toString(data.county),

            // Optional metadata
            station_id: this._toString(data.station_id),
            data_quality: this._toString(data.data_quality) || 'unverified'
        };

        // Validate required fields
        if (!cwnf.date) {
            throw new Error('C-WNF: date is required');
        }
        if (!cwnf.source) {
            throw new Error('C-WNF: source is required');
        }

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cwnf.date)) {
            throw new Error(`C-WNF: Invalid date format: ${cwnf.date} (expected YYYY-MM-DD)`);
        }

        // Validate source
        const validSources = ['GHCND', 'LCD', 'StormEvents', 'Normals', 'other'];
        if (!validSources.includes(cwnf.source)) {
            throw new Error(`C-WNF: Invalid source: ${cwnf.source}`);
        }

        return cwnf;
    }

    /**
     * Create C-WNF record with defaults
     * 
     * @param {Object} data - Partial climate data
     * @returns {Object} C-WNF record with defaults
     */
    static createWithDefaults(data) {
        return this.create({
            temp_max: null,
            temp_min: null,
            dew_point: null,
            precipitation: null,
            humidity_index: null,
            wind_speed: null,
            storm_event: 'none',
            storm_intensity: 'none',
            uv_proxy: 'unknown',
            seasonality_vector: null,
            zip: null,
            lat: null,
            lon: null,
            county: null,
            station_id: null,
            data_quality: 'unverified',
            ...data
        });
    }

    /**
     * Validate C-WNF record against schema
     * 
     * @param {Object} cwnf - C-WNF record
     * @returns {Object} Validation result { valid: boolean, errors: Array }
     */
    static validate(cwnf) {
        const errors = [];

        // Required fields
        if (!cwnf.date) errors.push('Missing required field: date');
        if (!cwnf.source) errors.push('Missing required field: source');

        // Date format
        if (cwnf.date && !/^\d{4}-\d{2}-\d{2}$/.test(cwnf.date)) {
            errors.push(`Invalid date format: ${cwnf.date}`);
        }

        // Temperature ranges
        if (cwnf.temp_max !== null && (cwnf.temp_max < -100 || cwnf.temp_max > 150)) {
            errors.push(`temp_max out of range: ${cwnf.temp_max}`);
        }
        if (cwnf.temp_min !== null && (cwnf.temp_min < -100 || cwnf.temp_min > 150)) {
            errors.push(`temp_min out of range: ${cwnf.temp_min}`);
        }
        if (cwnf.dew_point !== null && (cwnf.dew_point < -100 || cwnf.dew_point > 100)) {
            errors.push(`dew_point out of range: ${cwnf.dew_point}`);
        }

        // Precipitation
        if (cwnf.precipitation !== null && cwnf.precipitation < 0) {
            errors.push(`precipitation cannot be negative: ${cwnf.precipitation}`);
        }

        // Humidity
        if (cwnf.humidity_index !== null && (cwnf.humidity_index < 0 || cwnf.humidity_index > 100)) {
            errors.push(`humidity_index out of range: ${cwnf.humidity_index}`);
        }

        // Wind speed
        if (cwnf.wind_speed !== null && cwnf.wind_speed < 0) {
            errors.push(`wind_speed cannot be negative: ${cwnf.wind_speed}`);
        }

        // Coordinates
        if (cwnf.lat !== null && (cwnf.lat < -90 || cwnf.lat > 90)) {
            errors.push(`lat out of range: ${cwnf.lat}`);
        }
        if (cwnf.lon !== null && (cwnf.lon < -180 || cwnf.lon > 180)) {
            errors.push(`lon out of range: ${cwnf.lon}`);
        }

        // Enumerations
        const validStormEvents = [
            'none', 'thunderstorm', 'tornado', 'hurricane', 'tropical_storm',
            'hail', 'flood', 'flash_flood', 'winter_storm', 'ice_storm',
            'high_wind', 'other'
        ];
        if (cwnf.storm_event && !validStormEvents.includes(cwnf.storm_event)) {
            errors.push(`Invalid storm_event: ${cwnf.storm_event}`);
        }

        const validIntensities = ['none', 'minor', 'moderate', 'severe', 'extreme'];
        if (cwnf.storm_intensity && !validIntensities.includes(cwnf.storm_intensity)) {
            errors.push(`Invalid storm_intensity: ${cwnf.storm_intensity}`);
        }

        const validUVLevels = ['low', 'moderate', 'high', 'very_high', 'extreme', 'unknown'];
        if (cwnf.uv_proxy && !validUVLevels.includes(cwnf.uv_proxy)) {
            errors.push(`Invalid uv_proxy: ${cwnf.uv_proxy}`);
        }

        const validSources = ['GHCND', 'LCD', 'StormEvents', 'Normals', 'other'];
        if (cwnf.source && !validSources.includes(cwnf.source)) {
            errors.push(`Invalid source: ${cwnf.source}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Convert to float, return null if invalid
     * 
     * @private
     * @param {*} value - Value to convert
     * @returns {number|null} Float or null
     */
    static _toFloat(value) {
        if (value === null || value === undefined || value === '') return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }

    /**
     * Convert to string, return null if invalid
     * 
     * @private
     * @param {*} value - Value to convert
     * @returns {string|null} String or null
     */
    static _toString(value) {
        if (value === null || value === undefined || value === '') return null;
        return String(value);
    }

    /**
     * Convert to ISO date (YYYY-MM-DD)
     * 
     * @private
     * @param {*} value - Value to convert
     * @returns {string|null} ISO date or null
     */
    static _toISODate(value) {
        if (!value) return null;

        // If already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
        }

        // Try to parse as date
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;

        return date.toISOString().split('T')[0];
    }

    /**
     * Ensure value is an object, return null if invalid
     * 
     * @private
     * @param {*} value - Value to convert
     * @returns {Object|null} Object or null
     */
    static _toObject(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === 'object' && !Array.isArray(value)) return value;
        return null;
    }

    /**
     * Batch create C-WNF records
     * 
     * @param {Array} dataArray - Array of climate data
     * @returns {Array} Array of C-WNF records
     */
    static createBatch(dataArray) {
        return dataArray.map((data, index) => {
            try {
                return this.create(data);
            } catch (error) {
                console.error(`[cwnf] Error creating record ${index}:`, error.message);
                return null;
            }
        }).filter(Boolean);
    }

    /**
     * Validate batch of C-WNF records
     * 
     * @param {Array} cwnfArray - Array of C-WNF records
     * @returns {Object} Validation summary
     */
    static validateBatch(cwnfArray) {
        const results = cwnfArray.map(cwnf => this.validate(cwnf));
        const valid = results.filter(r => r.valid).length;
        const invalid = results.filter(r => !r.valid).length;
        const allErrors = results.flatMap(r => r.errors);

        return {
            total: cwnfArray.length,
            valid,
            invalid,
            errors: allErrors,
            validationRate: ((valid / cwnfArray.length) * 100).toFixed(2) + '%'
        };
    }
}

module.exports = CWNFFactory;
