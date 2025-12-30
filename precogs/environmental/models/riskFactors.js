/**
 * Risk Factors Engine
 * 
 * Transforms patterns in environmental.local_climate croutons into risk probabilities
 * for home maintenance and damage prediction.
 * 
 * @module riskFactors
 */

class RiskFactorsEngine {
    /**
     * Calculate comprehensive risk scores for a location
     * 
     * @param {Object} climateData - Environmental climate data
     * @param {Object} homeProfile - Home characteristics
     * @returns {Object} Risk scores and factors
     */
    static calculateRisks(climateData, homeProfile = {}) {
        const {
            temp_max_avg,
            temp_min_avg,
            dew_point_avg,
            precipitation_total,
            humidity_avg,
            storm_events,
            temp_swings
        } = this._aggregateClimateData(climateData);

        return {
            mold_risk: this._calculateMoldRisk(dew_point_avg, humidity_avg, precipitation_total),
            siding_expansion_risk: this._calculateSidingRisk(temp_swings, homeProfile.siding_material),
            roof_rot_risk: this._calculateRoofRotRisk(precipitation_total, humidity_avg, homeProfile.roof_age),
            hvac_seasonal_load: this._calculateHvacLoad(temp_max_avg, temp_min_avg, humidity_avg),
            flood_risk: this._calculateFloodRisk(precipitation_total, storm_events),
            paint_deterioration_risk: this._calculatePaintRisk(humidity_avg, temp_swings, precipitation_total),
            foundation_stress_risk: this._calculateFoundationRisk(precipitation_total, temp_swings),
            metadata: {
                data_points: climateData.length,
                date_range: this._getDateRange(climateData),
                confidence: this._calculateConfidence(climateData.length)
            }
        };
    }

    /**
     * Calculate mold risk from humidity and dew point patterns
     * 
     * Mold thrives when:
     * - Dew point > 65°F
     * - Humidity > 60%
     * - Precipitation frequent
     * 
     * @private
     * @param {number} dewPoint - Average dew point (°F)
     * @param {number} humidity - Average humidity (%)
     * @param {number} precipitation - Total precipitation (inches)
     * @returns {number} Risk score 0-1
     */
    static _calculateMoldRisk(dewPoint, humidity, precipitation) {
        let risk = 0;

        // Dew point contribution (0-0.4)
        if (dewPoint > 75) risk += 0.4;
        else if (dewPoint > 70) risk += 0.3;
        else if (dewPoint > 65) risk += 0.2;
        else if (dewPoint > 60) risk += 0.1;

        // Humidity contribution (0-0.4)
        if (humidity > 80) risk += 0.4;
        else if (humidity > 70) risk += 0.3;
        else if (humidity > 60) risk += 0.2;
        else if (humidity > 50) risk += 0.1;

        // Precipitation contribution (0-0.2)
        if (precipitation > 60) risk += 0.2;
        else if (precipitation > 50) risk += 0.15;
        else if (precipitation > 40) risk += 0.1;
        else if (precipitation > 30) risk += 0.05;

        return Math.min(1.0, risk);
    }

    /**
     * Calculate siding expansion/warping risk
     * 
     * Vinyl siding expands/contracts with temperature swings
     * Wood siding warps with moisture + temperature cycles
     * 
     * @private
     * @param {number} tempSwings - Average daily temperature swing (°F)
     * @param {string} sidingMaterial - Siding material type
     * @returns {number} Risk score 0-1
     */
    static _calculateSidingRisk(tempSwings, sidingMaterial = 'vinyl') {
        let baseRisk = 0;

        // Temperature swing contribution
        if (tempSwings > 30) baseRisk = 0.8;
        else if (tempSwings > 25) baseRisk = 0.6;
        else if (tempSwings > 20) baseRisk = 0.4;
        else if (tempSwings > 15) baseRisk = 0.2;

        // Material multipliers
        const materialFactors = {
            vinyl: 1.2,    // Most susceptible to expansion
            wood: 1.0,     // Moderate risk
            fiber_cement: 0.7,  // More stable
            brick: 0.3,    // Very stable
            stucco: 0.5    // Moderate
        };

        const factor = materialFactors[sidingMaterial] || 1.0;
        return Math.min(1.0, baseRisk * factor);
    }

    /**
     * Calculate roof rot risk
     * 
     * Roof rot occurs with:
     * - High precipitation
     * - High humidity
     * - Poor ventilation (age factor)
     * 
     * @private
     * @param {number} precipitation - Total precipitation (inches)
     * @param {number} humidity - Average humidity (%)
     * @param {number} roofAge - Roof age in years
     * @returns {number} Risk score 0-1
     */
    static _calculateRoofRotRisk(precipitation, humidity, roofAge = 10) {
        let risk = 0;

        // Precipitation contribution (0-0.4)
        if (precipitation > 60) risk += 0.4;
        else if (precipitation > 50) risk += 0.3;
        else if (precipitation > 40) risk += 0.2;
        else if (precipitation > 30) risk += 0.1;

        // Humidity contribution (0-0.3)
        if (humidity > 75) risk += 0.3;
        else if (humidity > 65) risk += 0.2;
        else if (humidity > 55) risk += 0.1;

        // Age factor (0-0.3)
        if (roofAge > 20) risk += 0.3;
        else if (roofAge > 15) risk += 0.2;
        else if (roofAge > 10) risk += 0.1;

        return Math.min(1.0, risk);
    }

    /**
     * Calculate HVAC seasonal load
     * 
     * @private
     * @param {number} tempMax - Average max temperature (°F)
     * @param {number} tempMin - Average min temperature (°F)
     * @param {number} humidity - Average humidity (%)
     * @returns {string} Load level: low, moderate, high, extreme
     */
    static _calculateHvacLoad(tempMax, tempMin, humidity) {
        // Heat index calculation (simplified)
        const heatStress = (tempMax > 90 && humidity > 60) ? 'extreme' :
            (tempMax > 85 && humidity > 50) ? 'high' :
                (tempMax > 80) ? 'moderate' : 'low';

        // Cold stress
        const coldStress = (tempMin < 32) ? 'high' :
            (tempMin < 45) ? 'moderate' : 'low';

        // Combined load
        if (heatStress === 'extreme' || coldStress === 'high') return 'extreme';
        if (heatStress === 'high' || coldStress === 'moderate') return 'high';
        if (heatStress === 'moderate') return 'moderate';
        return 'low';
    }

    /**
     * Calculate flood risk
     * 
     * @private
     * @param {number} precipitation - Total precipitation (inches)
     * @param {Array} stormEvents - Storm event records
     * @returns {number} Risk score 0-1
     */
    static _calculateFloodRisk(precipitation, stormEvents = []) {
        let risk = 0;

        // Precipitation contribution (0-0.5)
        if (precipitation > 70) risk += 0.5;
        else if (precipitation > 60) risk += 0.4;
        else if (precipitation > 50) risk += 0.3;
        else if (precipitation > 40) risk += 0.2;

        // Storm events contribution (0-0.5)
        const floodEvents = stormEvents.filter(e =>
            e.storm_event === 'flood' ||
            e.storm_event === 'flash_flood' ||
            e.storm_intensity === 'severe' ||
            e.storm_intensity === 'extreme'
        );

        if (floodEvents.length > 5) risk += 0.5;
        else if (floodEvents.length > 3) risk += 0.4;
        else if (floodEvents.length > 1) risk += 0.3;
        else if (floodEvents.length > 0) risk += 0.2;

        return Math.min(1.0, risk);
    }

    /**
     * Calculate paint deterioration risk
     * 
     * @private
     * @param {number} humidity - Average humidity (%)
     * @param {number} tempSwings - Temperature swings (°F)
     * @param {number} precipitation - Total precipitation (inches)
     * @returns {number} Risk score 0-1
     */
    static _calculatePaintRisk(humidity, tempSwings, precipitation) {
        let risk = 0;

        // Humidity (0-0.35)
        if (humidity > 75) risk += 0.35;
        else if (humidity > 65) risk += 0.25;
        else if (humidity > 55) risk += 0.15;

        // Temperature swings (0-0.35)
        if (tempSwings > 30) risk += 0.35;
        else if (tempSwings > 25) risk += 0.25;
        else if (tempSwings > 20) risk += 0.15;

        // Precipitation (0-0.3)
        if (precipitation > 60) risk += 0.3;
        else if (precipitation > 50) risk += 0.2;
        else if (precipitation > 40) risk += 0.1;

        return Math.min(1.0, risk);
    }

    /**
     * Calculate foundation stress risk
     * 
     * @private
     * @param {number} precipitation - Total precipitation (inches)
     * @param {number} tempSwings - Temperature swings (°F)
     * @returns {number} Risk score 0-1
     */
    static _calculateFoundationRisk(precipitation, tempSwings) {
        let risk = 0;

        // Soil moisture stress from precipitation (0-0.6)
        if (precipitation > 70) risk += 0.6;
        else if (precipitation > 60) risk += 0.5;
        else if (precipitation > 50) risk += 0.4;
        else if (precipitation > 40) risk += 0.3;

        // Freeze-thaw cycles (0-0.4)
        if (tempSwings > 40) risk += 0.4;
        else if (tempSwings > 35) risk += 0.3;
        else if (tempSwings > 30) risk += 0.2;

        return Math.min(1.0, risk);
    }

    /**
     * Aggregate climate data for analysis
     * 
     * @private
     * @param {Array} climateData - Array of climate records
     * @returns {Object} Aggregated metrics
     */
    static _aggregateClimateData(climateData) {
        const temps_max = climateData.map(d => d.temp_max).filter(Boolean);
        const temps_min = climateData.map(d => d.temp_min).filter(Boolean);
        const dew_points = climateData.map(d => d.dew_point).filter(Boolean);
        const precip = climateData.map(d => d.precipitation || 0);
        const humidity = climateData.map(d => d.humidity_index).filter(Boolean);
        const storms = climateData.filter(d => d.storm_event && d.storm_event !== 'none');

        // Calculate temperature swings
        const swings = climateData
            .filter(d => d.temp_max && d.temp_min)
            .map(d => d.temp_max - d.temp_min);

        return {
            temp_max_avg: this._average(temps_max),
            temp_min_avg: this._average(temps_min),
            dew_point_avg: this._average(dew_points),
            precipitation_total: precip.reduce((a, b) => a + b, 0),
            humidity_avg: this._average(humidity),
            storm_events: storms,
            temp_swings: this._average(swings)
        };
    }

    /**
     * Calculate average of array
     * 
     * @private
     * @param {Array} arr - Array of numbers
     * @returns {number} Average
     */
    static _average(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    /**
     * Get date range from climate data
     * 
     * @private
     * @param {Array} climateData - Climate records
     * @returns {Object} Date range
     */
    static _getDateRange(climateData) {
        const dates = climateData.map(d => d.date).filter(Boolean).sort();
        return {
            start: dates[0] || null,
            end: dates[dates.length - 1] || null
        };
    }

    /**
     * Calculate confidence based on data points
     * 
     * @private
     * @param {number} dataPoints - Number of data points
     * @returns {number} Confidence 0-1
     */
    static _calculateConfidence(dataPoints) {
        if (dataPoints >= 365) return 1.0;
        if (dataPoints >= 180) return 0.9;
        if (dataPoints >= 90) return 0.8;
        if (dataPoints >= 30) return 0.7;
        if (dataPoints >= 7) return 0.6;
        return 0.5;
    }
}

module.exports = RiskFactorsEngine;
