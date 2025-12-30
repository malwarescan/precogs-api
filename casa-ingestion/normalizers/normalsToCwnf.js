/**
 * Normals to C-WNF Normalizer
 * 
 * Converts NOAA Climate Normals (30-year averages) to CASA Weather Normal Form.
 * 
 * @module normalsToCwnf
 */

const CWNFFactory = require('../CWNFFactory');

class NormalsToCwnf {
    /**
     * Convert Normals record to C-WNF
     * 
     * @param {Object} normalsRecord - Normals record
     * @param {Object} locationData - Location metadata
     * @param {string} referenceDate - Reference date for the normal (YYYY-MM-DD)
     * @returns {Object} C-WNF record
     */
    static normalize(normalsRecord, locationData = {}, referenceDate) {
        const normals = normalsRecord.normals || {};

        // Extract normal values (already in standard units)
        const temp_max = normals['DLY-TMAX-NORMAL'] || null;
        const temp_min = normals['DLY-TMIN-NORMAL'] || null;
        const precipitation = normals['DLY-PRCP-NORMAL'] || null;

        // Normals don't have real-time data
        const dew_point = null;
        const humidity_index = null;
        const wind_speed = null;
        const storm_event = 'none';
        const storm_intensity = 'none';
        const uv_proxy = 'unknown';

        // Enhanced seasonality vector with climate zone
        const seasonality_vector = this._calculateSeasonality(
            referenceDate,
            normalsRecord.day_of_year,
            locationData.climate_zone
        );

        return CWNFFactory.create({
            date: referenceDate,
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
            source: 'Normals',
            station_id: normalsRecord.station || null,
            data_quality: 'verified'
        });
    }

    /**
     * Calculate enhanced seasonality vector with climate zone
     * 
     * @private
     * @param {string} date - ISO date
     * @param {number} dayOfYear - Day of year from normals
     * @param {string} climateZone - Köppen climate classification
     * @returns {Object} Seasonality vector
     */
    static _calculateSeasonality(date, dayOfYear, climateZone = 'unknown') {
        const d = new Date(date);
        const month = d.getMonth() + 1;
        const calculatedDayOfYear = dayOfYear || this._getDayOfYear(d);

        let season;
        if (month >= 3 && month <= 5) season = 'spring';
        else if (month >= 6 && month <= 8) season = 'summer';
        else if (month >= 9 && month <= 11) season = 'fall';
        else season = 'winter';

        return {
            season,
            month,
            day_of_year: calculatedDayOfYear,
            climate_zone: climateZone
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
     * Batch normalize normals records
     * 
     * @param {Array} normalsRecords - Array of normals records
     * @param {Object} locationData - Location metadata
     * @param {string} baseYear - Base year for reference dates
     * @returns {Array} Array of C-WNF records
     */
    static normalizeBatch(normalsRecords, locationData = {}, baseYear = new Date().getFullYear()) {
        return normalsRecords.map(record => {
            try {
                // Generate reference date from day of year
                const referenceDate = this._dayOfYearToDate(record.day_of_year, baseYear);
                return this.normalize(record, locationData, referenceDate);
            } catch (error) {
                console.error(`[normals-normalizer] Error normalizing record:`, error.message);
                return null;
            }
        }).filter(Boolean);
    }

    /**
     * Convert day of year to ISO date
     * 
     * @private
     * @param {number} dayOfYear - Day of year (1-366)
     * @param {number} year - Year
     * @returns {string} ISO date (YYYY-MM-DD)
     */
    static _dayOfYearToDate(dayOfYear, year) {
        const date = new Date(year, 0);
        date.setDate(dayOfYear);
        return date.toISOString().split('T')[0];
    }
}

module.exports = NormalsToCwnf;
