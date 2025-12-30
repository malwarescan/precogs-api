/**
 * GHCND (Global Historical Climatology Network - Daily) Adapter
 * 
 * Fetches daily temperature, precipitation, and weather data from GHCND dataset.
 * 
 * @module ghcndAdapter
 */

const NoaaClient = require('./noaaClient');

const GHCND_DATASET_ID = 'GHCND';

// Data type IDs for GHCND
const DATA_TYPES = {
    TMAX: 'TMAX',  // Maximum temperature
    TMIN: 'TMIN',  // Minimum temperature
    PRCP: 'PRCP',  // Precipitation
    SNOW: 'SNOW',  // Snowfall
    SNWD: 'SNWD',  // Snow depth
    AWND: 'AWND',  // Average wind speed
    TAVG: 'TAVG'   // Average temperature
};

class GhcndAdapter {
    constructor(apiToken) {
        this.client = new NoaaClient(apiToken);
    }

    /**
     * Fetch daily climate data for a location
     * 
     * @param {Object} params - Query parameters
     * @param {string} params.locationId - NOAA location ID (e.g., 'ZIP:33907')
     * @param {string} params.startDate - Start date (YYYY-MM-DD)
     * @param {string} params.endDate - End date (YYYY-MM-DD)
     * @param {Array<string>} params.dataTypes - Data types to fetch (default: all)
     * @param {number} params.limit - Results per page (default: 1000)
     * @returns {Promise<Array>} Raw GHCND records
     */
    async fetchDailyData(params) {
        const {
            locationId,
            startDate,
            endDate,
            dataTypes = Object.values(DATA_TYPES),
            limit = 1000
        } = params;

        if (!locationId || !startDate || !endDate) {
            throw new Error('locationId, startDate, and endDate are required');
        }

        const queryParams = {
            datasetid: GHCND_DATASET_ID,
            locationid: locationId,
            startdate: startDate,
            enddate: endDate,
            datatypeid: dataTypes.join(','),
            limit,
            units: 'standard' // Fahrenheit, inches
        };

        console.log(`[ghcnd] Fetching data for ${locationId} from ${startDate} to ${endDate}`);

        try {
            const results = await this.client.fetchAllPages('data', queryParams);

            console.log(`[ghcnd] Fetched ${results.length} records`);

            return this._groupByDate(results);
        } catch (error) {
            console.error('[ghcnd] Fetch error:', error.message);
            throw error;
        }
    }

    /**
     * Fetch data for a specific ZIP code
     * 
     * @param {string} zip - ZIP code
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Array>} Daily records grouped by date
     */
    async fetchByZip(zip, startDate, endDate) {
        return this.fetchDailyData({
            locationId: `ZIP:${zip}`,
            startDate,
            endDate
        });
    }

    /**
     * Fetch recent data (last N days)
     * 
     * @param {string} locationId - NOAA location ID
     * @param {number} days - Number of days to look back
     * @returns {Promise<Array>} Recent daily records
     */
    async fetchRecent(locationId, days = 30) {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        return this.fetchDailyData({
            locationId,
            startDate,
            endDate
        });
    }

    /**
     * Get available stations for a location
     * 
     * @param {string} locationId - NOAA location ID
     * @returns {Promise<Array>} List of stations
     */
    async getStations(locationId) {
        return this.client.getStations({
            locationid: locationId,
            datasetid: GHCND_DATASET_ID
        });
    }

    /**
     * Group records by date for easier processing
     * 
     * @private
     * @param {Array} records - Raw GHCND records
     * @returns {Array} Records grouped by date
     */
    _groupByDate(records) {
        const grouped = {};

        records.forEach(record => {
            const date = record.date.split('T')[0]; // Extract YYYY-MM-DD

            if (!grouped[date]) {
                grouped[date] = {
                    date,
                    station: record.station,
                    datatype: {},
                    attributes: record.attributes || ''
                };
            }

            // Store value by datatype
            grouped[date].datatype[record.datatype] = record.value;
        });

        // Convert to array and sort by date
        return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
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

module.exports = GhcndAdapter;
