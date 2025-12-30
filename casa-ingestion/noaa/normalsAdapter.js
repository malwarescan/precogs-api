/**
 * Normals Adapter
 * 
 * Fetches 30-year climate normals for baseline comparisons.
 * 
 * @module normalsAdapter
 */

const NoaaClient = require('./noaaClient');

const NORMALS_DATASET_ID = 'NORMAL_DLY';

class NormalsAdapter {
    constructor(apiToken) {
        this.client = new NoaaClient(apiToken);
    }

    /**
     * Fetch climate normals for a station
     * 
     * @param {Object} params - Query parameters
     * @param {string} params.stationId - Station ID
     * @param {Array<string>} params.dataTypes - Data types to fetch
     * @param {number} params.limit - Results per page
     * @returns {Promise<Array>} Normal records
     */
    async fetchNormals(params) {
        const {
            stationId,
            dataTypes = ['DLY-TMAX-NORMAL', 'DLY-TMIN-NORMAL', 'DLY-PRCP-NORMAL'],
            limit = 1000
        } = params;

        if (!stationId) {
            throw new Error('stationId is required');
        }

        const queryParams = {
            datasetid: NORMALS_DATASET_ID,
            stationid: stationId,
            datatypeid: dataTypes.join(','),
            limit,
            units: 'standard'
        };

        console.log(`[normals] Fetching climate normals for station ${stationId}`);

        try {
            const results = await this.client.fetchAllPages('data', queryParams);
            console.log(`[normals] Fetched ${results.length} normal records`);
            return this._processNormals(results);
        } catch (error) {
            console.error('[normals] Fetch error:', error.message);
            throw error;
        }
    }

    /**
     * Get normals for a specific location
     * 
     * @param {string} locationId - NOAA location ID
     * @returns {Promise<Array>} Climate normals
     */
    async fetchByLocation(locationId) {
        // First find stations for this location
        const stations = await this.client.getStations({
            locationid: locationId,
            datasetid: NORMALS_DATASET_ID,
            limit: 1
        });

        if (stations.length === 0) {
            throw new Error(`No normals stations found for ${locationId}`);
        }

        return this.fetchNormals({ stationId: stations[0].id });
    }

    /**
     * Process normals into usable format
     * 
     * @private
     * @param {Array} records - Raw normal records
     * @returns {Array} Processed normals by day of year
     */
    _processNormals(records) {
        const byDayOfYear = {};

        records.forEach(record => {
            // Extract day of year from datatype (e.g., 'DLY-TMAX-NORMAL' -> day number)
            const dayMatch = record.datatype.match(/(\d{3})$/);
            const dayOfYear = dayMatch ? parseInt(dayMatch[1]) : null;

            if (!dayOfYear) return;

            if (!byDayOfYear[dayOfYear]) {
                byDayOfYear[dayOfYear] = {
                    day_of_year: dayOfYear,
                    station: record.station,
                    normals: {}
                };
            }

            // Store normal value by type
            const typeKey = record.datatype.replace(/-\d{3}$/, '');
            byDayOfYear[dayOfYear].normals[typeKey] = record.value;
        });

        return Object.values(byDayOfYear).sort((a, b) => a.day_of_year - b.day_of_year);
    }

    /**
     * Calculate seasonality vector for a date
     * 
     * @param {string} date - Date (YYYY-MM-DD)
     * @param {string} climateZone - Köppen climate classification
     * @returns {Object} Seasonality vector
     */
    calculateSeasonalityVector(date, climateZone = 'unknown') {
        const d = new Date(date);
        const month = d.getMonth() + 1;
        const dayOfYear = this._getDayOfYear(d);

        // Determine season (Northern Hemisphere)
        let season;
        if (month >= 3 && month <= 5) season = 'spring';
        else if (month >= 6 && month <= 8) season = 'summer';
        else if (month >= 9 && month <= 11) season = 'fall';
        else season = 'winter';

        return {
            season,
            month,
            day_of_year: dayOfYear,
            climate_zone: climateZone
        };
    }

    /**
     * Get day of year from date
     * 
     * @private
     * @param {Date} date - Date object
     * @returns {number} Day of year (1-366)
     */
    _getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
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

module.exports = NormalsAdapter;
