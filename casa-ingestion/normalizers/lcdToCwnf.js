/**
 * LCD to C-WNF Normalizer
 * 
 * Converts LCD (Local Climatological Data) to CASA Weather Normal Form.
 * LCD provides hourly/daily summaries with more detailed atmospheric data.
 * 
 * @module lcdToCwnf
 */

const CWNFFactory = require('../CWNFFactory');

class LcdToCwnf {
    /**
     * Convert LCD record to C-WNF
     * 
     * @param {Object} lcdRecord - LCD record
     * @param {Object} locationData - Location metadata
     * @returns {Object} C-WNF record
     */
    static normalize(lcdRecord, locationData = {}) {
        // LCD data is already in standard units (Fahrenheit, inches)
        const temp_max = lcdRecord.value?.temp_max || null;
        const temp_min = lcdRecord.value?.temp_min || null;
        const dew_point = lcdRecord.value?.dew_point || null;
        const precipitation = lcdRecord.value?.precipitation || null;
        const wind_speed = lcdRecord.value?.wind_speed || null;

        // Derive humidity index from dew point and temperature
        const humidity_index = this._deriveHumidityIndex(temp_max, dew_point);

        // Determine storm event from weather type codes
        const storm_event = this._deriveStormEvent(lcdRecord.value?.weather_type);
        const storm_intensity = this._deriveStormIntensity(precipitation, wind_speed);

        // UV proxy (may be available in some LCD data)
        const uv_proxy = lcdRecord.value?.uv_index
            ? this._uvIndexToProxy(lcdRecord.value.uv_index)
            : 'unknown';

        // Calculate seasonality vector
        const seasonality_vector = this._calculateSeasonality(lcdRecord.date);

        return CWNFFactory.create({
            date: lcdRecord.date,
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
            source: 'LCD',
            station_id: lcdRecord.station || null,
            data_quality: 'verified' // LCD data is generally high quality
        });
    }

    /**
     * Derive humidity index from temperature and dew point
     * 
     * Uses simplified heat index calculation
     * 
     * @private
     * @param {number} temp - Temperature in Fahrenheit
     * @param {number} dewPoint - Dew point in Fahrenheit
     * @returns {number|null} Relative humidity percentage
     */
    static _deriveHumidityIndex(temp, dewPoint) {
        if (!temp || !dewPoint) return null;

        // Simplified RH calculation from temp and dew point
        // RH ≈ 100 - 5 * (T - Td)
        const rh = 100 - (5 * (temp - dewPoint));

        // Clamp to 0-100 range
        return Math.max(0, Math.min(100, rh));
    }

    /**
     * Derive storm event from weather type codes
     * 
     * @private
     * @param {string} weatherType - Weather type code
     * @returns {string} Storm event type
     */
    static _deriveStormEvent(weatherType) {
        if (!weatherType) return 'none';

        const type = weatherType.toLowerCase();

        if (type.includes('tornado')) return 'tornado';
        if (type.includes('hurricane')) return 'hurricane';
        if (type.includes('tropical')) return 'tropical_storm';
        if (type.includes('thunder')) return 'thunderstorm';
        if (type.includes('hail')) return 'hail';
        if (type.includes('flood')) return 'flood';
        if (type.includes('ice')) return 'ice_storm';
        if (type.includes('snow') || type.includes('blizzard')) return 'winter_storm';
        if (type.includes('wind')) return 'high_wind';

        return 'none';
    }

    /**
     * Derive storm intensity
     * 
     * @private
     * @param {number} precip - Precipitation in inches
     * @param {number} wind - Wind speed in mph
     * @returns {string} Storm intensity
     */
    static _deriveStormIntensity(precip, wind) {
        if ((wind && wind > 75) || (precip && precip > 6)) return 'extreme';
        if ((wind && wind > 60) || (precip && precip > 4)) return 'severe';
        if ((wind && wind > 40) || (precip && precip > 2)) return 'moderate';
        if ((wind && wind > 25) || (precip && precip > 0.5)) return 'minor';
        return 'none';
    }

    /**
     * Convert UV index to proxy classification
     * 
     * @private
     * @param {number} uvIndex - UV index value
     * @returns {string} UV proxy classification
     */
    static _uvIndexToProxy(uvIndex) {
        if (uvIndex >= 11) return 'extreme';
        if (uvIndex >= 8) return 'very_high';
        if (uvIndex >= 6) return 'high';
        if (uvIndex >= 3) return 'moderate';
        return 'low';
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
     * Batch normalize LCD records
     * 
     * @param {Array} lcdRecords - Array of LCD records
     * @param {Object} locationData - Location metadata
     * @returns {Array} Array of C-WNF records
     */
    static normalizeBatch(lcdRecords, locationData = {}) {
        return lcdRecords.map(record => {
            try {
                return this.normalize(record, locationData);
            } catch (error) {
                console.error(`[lcd-normalizer] Error normalizing record:`, error.message);
                return null;
            }
        }).filter(Boolean);
    }
}

module.exports = LcdToCwnf;
