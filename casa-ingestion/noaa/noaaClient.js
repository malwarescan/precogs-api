/**
 * NOAA API Client
 * 
 * Unified client for all NOAA Climate Data Online (CDO) API requests.
 * Handles authentication, rate limiting, retries, and pagination.
 * 
 * @module noaaClient
 */

const https = require('https');

const NOAA_BASE_URL = 'https://www.ncdc.noaa.gov/cdo-web/api/v2';
const RATE_LIMIT_MS = 200; // 5 requests per second max
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

class NoaaClient {
    constructor(apiToken) {
        if (!apiToken) {
            throw new Error('NOAA API token is required');
        }
        this.apiToken = apiToken;
        this.lastRequestTime = 0;
        this.requestCount = 0;
        this.failedRequests = [];
    }

    /**
     * Unified fetch method for all NOAA datasets
     * 
     * @param {string} dataset - Dataset name (data, stations, locations, etc.)
     * @param {Object} params - Query parameters
     * @param {number} retryCount - Current retry attempt
     * @returns {Promise<Object>} API response with metadata
     */
    async fetchData(dataset, params = {}, retryCount = 0) {
        // Rate limiting
        await this._enforceRateLimit();

        // Build query string
        const queryString = this._buildQueryString(params);
        const url = `${NOAA_BASE_URL}/${dataset}${queryString ? '?' + queryString : ''}`;

        try {
            console.log(`[noaa] Fetching ${dataset} with params:`, params);

            const response = await this._makeRequest(url);

            this.requestCount++;

            return {
                ok: true,
                data: response.results || [],
                metadata: {
                    resultset: response.metadata?.resultset || {},
                    count: response.metadata?.resultset?.count || 0,
                    limit: response.metadata?.resultset?.limit || 0,
                    offset: response.metadata?.resultset?.offset || 0
                },
                dataset,
                params,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[noaa] Request failed for ${dataset}:`, error.message);

            // Retry logic with exponential backoff
            if (retryCount < MAX_RETRIES) {
                const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
                console.log(`[noaa] Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);

                await this._sleep(delay);
                return this.fetchData(dataset, params, retryCount + 1);
            }

            // Log failed request
            this.failedRequests.push({
                dataset,
                params,
                error: error.message,
                timestamp: new Date().toISOString()
            });

            throw error;
        }
    }

    /**
     * Fetch data with automatic pagination
     * 
     * @param {string} dataset - Dataset name
     * @param {Object} params - Query parameters
     * @param {number} maxResults - Maximum total results to fetch
     * @returns {Promise<Array>} All results across pages
     */
    async fetchAllPages(dataset, params = {}, maxResults = 10000) {
        const limit = params.limit || 1000;
        let offset = params.offset || 0;
        let allResults = [];
        let hasMore = true;

        while (hasMore && allResults.length < maxResults) {
            const response = await this.fetchData(dataset, {
                ...params,
                limit,
                offset
            });

            allResults = allResults.concat(response.data);

            // Check if there are more pages
            const totalCount = response.metadata.count;
            hasMore = (offset + limit) < totalCount;
            offset += limit;

            console.log(`[noaa] Fetched ${allResults.length}/${totalCount} records`);

            if (!hasMore || allResults.length >= maxResults) {
                break;
            }
        }

        return allResults;
    }

    /**
     * Get available datasets
     * 
     * @returns {Promise<Array>} List of available datasets
     */
    async getDatasets() {
        const response = await this.fetchData('datasets');
        return response.data;
    }

    /**
     * Get stations by location
     * 
     * @param {Object} filters - Location filters (locationid, extent, etc.)
     * @returns {Promise<Array>} List of stations
     */
    async getStations(filters = {}) {
        const response = await this.fetchData('stations', filters);
        return response.data;
    }

    /**
     * Get data categories
     * 
     * @returns {Promise<Array>} List of data categories
     */
    async getDataCategories() {
        const response = await this.fetchData('datacategories');
        return response.data;
    }

    /**
     * Get data types for a dataset
     * 
     * @param {string} datasetId - Dataset ID
     * @returns {Promise<Array>} List of data types
     */
    async getDataTypes(datasetId) {
        const response = await this.fetchData('datatypes', { datasetid: datasetId });
        return response.data;
    }

    /**
     * Get failed requests log
     * 
     * @returns {Array} Failed requests
     */
    getFailedRequests() {
        return this.failedRequests;
    }

    /**
     * Get request statistics
     * 
     * @returns {Object} Request stats
     */
    getStats() {
        return {
            totalRequests: this.requestCount,
            failedRequests: this.failedRequests.length,
            successRate: this.requestCount > 0
                ? ((this.requestCount - this.failedRequests.length) / this.requestCount * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }

    /**
     * Make HTTPS request to NOAA API
     * 
     * @private
     * @param {string} url - Full URL
     * @returns {Promise<Object>} Parsed JSON response
     */
    _makeRequest(url) {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'token': this.apiToken,
                    'Accept': 'application/json'
                }
            };

            https.get(url, options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const parsed = JSON.parse(data);
                            resolve(parsed);
                        } catch (e) {
                            reject(new Error(`Failed to parse JSON: ${e.message}`));
                        }
                    } else if (res.statusCode === 429) {
                        reject(new Error('Rate limit exceeded'));
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * Build query string from params object
     * 
     * @private
     * @param {Object} params - Query parameters
     * @returns {string} URL-encoded query string
     */
    _buildQueryString(params) {
        return Object.entries(params)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
    }

    /**
     * Enforce rate limiting (5 requests per second)
     * 
     * @private
     * @returns {Promise<void>}
     */
    async _enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < RATE_LIMIT_MS) {
            const delay = RATE_LIMIT_MS - timeSinceLastRequest;
            await this._sleep(delay);
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * Sleep utility
     * 
     * @private
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = NoaaClient;
