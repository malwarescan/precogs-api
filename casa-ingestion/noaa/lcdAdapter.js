/**
 * LCD (Local Climatological Data) Adapter
 * 
 * Fetches hourly/daily summaries from airport weather stations.
 * 
 * @module lcdAdapter
 */

const NoaaClient = require('./noaaClient');

const LCD_DATASET_ID = 'NORMAL_DLY';

class LcdAdapter {
    constructor(apiToken) {
        this.client = new NoaaClient(apiToken);
    }

    /**
     * Fetch local climatological data
     * 
     * @param {Object} params - Query parameters
     * @param {string} params.stationId - Station ID (e.g., 'GHCND:USW00012839')
     * @param {string} params.startDate - Start date (YYYY-MM-DD)
     * @param {string} params.endDate - End date (YYYY-MM-DD)
     * @param {number} params.limit - Results per page
     * @returns {Promise<Array>} LCD records
     */
    async fetchData(params) {
        const {
            stationId,
            startDate,
            endDate,
            limit = 1000
        } = params;

        if (!stationId || !startDate || !endDate) {
            throw new Error('stationId, startDate, and endDate are required');
        }

        const queryParams = {
            datasetid: LCD_DATASET_ID,
            stationid: stationId,
            startdate: startDate,
            enddate: endDate,
            limit,
            units: 'standard'
        };

        console.log(`[lcd] Fetching data for station ${stationId} from ${startDate} to ${endDate}`);

        try {
            const results = await this.client.fetchAllPages('data', queryParams);
            console.log(`[lcd] Fetched ${results.length} records`);
            return results;
        } catch (error) {
            console.error('[lcd] Fetch error:', error.message);
            throw error;
        }
    }

    /**
     * Find nearest station to a location
     * 
     * @param {string} locationId - NOAA location ID
     * @returns {Promise<Object>} Nearest station
     */
    async findNearestStation(locationId) {
        const stations = await this.client.getStations({
            locationid: locationId,
            datasetid: LCD_DATASET_ID,
            limit: 1
        });

        if (stations.length === 0) {
            throw new Error(`No LCD stations found for ${locationId}`);
        }

        return stations[0];
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

module.exports = LcdAdapter;
