/**
 * Maintenance Timing Engine
 * 
 * Uses climate normals + microclimate patterns to determine optimal
 * maintenance windows for home care activities.
 * 
 * @module maintenanceTiming
 */

class MaintenanceTimingEngine {
    /**
     * Calculate optimal maintenance windows for a location
     * 
     * @param {Array} climateData - Historical climate data
     * @param {Array} normals - Climate normals data
     * @param {string} currentDate - Current date (YYYY-MM-DD)
     * @returns {Object} Maintenance recommendations
     */
    static calculateMaintenanceWindows(climateData, normals = [], currentDate = new Date().toISOString().split('T')[0]) {
        const monthlyPatterns = this._analyzeMonthlyPatterns(climateData, normals);

        return {
            painting: this._calculatePaintingWindow(monthlyPatterns, currentDate),
            hvac_service: this._calculateHvacServiceWindow(monthlyPatterns, currentDate),
            pressure_washing: this._calculatePressureWashingWindow(monthlyPatterns, currentDate),
            roof_inspection: this._calculateRoofInspectionWindow(monthlyPatterns, currentDate),
            gutter_cleaning: this._calculateGutterCleaningWindow(monthlyPatterns, currentDate),
            lawn_care: this._calculateLawnCareWindow(monthlyPatterns, currentDate),
            metadata: {
                analysis_date: currentDate,
                data_points: climateData.length,
                confidence: this._calculateConfidence(climateData.length)
            }
        };
    }

    /**
     * Calculate optimal painting window
     * 
     * Best conditions:
     * - Temperature: 50-85°F
     * - Humidity: <70%
     * - Low precipitation
     * - Stable temperatures (low swings)
     * 
     * @private
     * @param {Object} monthlyPatterns - Monthly climate patterns
     * @param {string} currentDate - Current date
     * @returns {Object} Painting recommendation
     */
    static _calculatePaintingWindow(monthlyPatterns, currentDate) {
        const scores = monthlyPatterns.map(month => {
            let score = 100;

            // Temperature range penalty
            if (month.temp_avg < 50 || month.temp_avg > 85) score -= 40;
            else if (month.temp_avg < 55 || month.temp_avg > 80) score -= 20;

            // Humidity penalty
            if (month.humidity_avg > 80) score -= 30;
            else if (month.humidity_avg > 70) score -= 15;

            // Precipitation penalty
            if (month.precipitation_avg > 5) score -= 25;
            else if (month.precipitation_avg > 3) score -= 10;

            // Temperature stability bonus
            if (month.temp_swing_avg < 15) score += 10;

            return {
                month: month.month,
                month_name: month.month_name,
                score: Math.max(0, score),
                conditions: {
                    temperature: month.temp_avg,
                    humidity: month.humidity_avg,
                    precipitation: month.precipitation_avg
                }
            };
        });

        // Find best month
        const best = scores.reduce((a, b) => a.score > b.score ? a : b);

        // Find best week within that month
        const bestWeek = this._findBestWeekInMonth(best.month, monthlyPatterns);

        return {
            recommended_month: best.month_name,
            recommended_week: bestWeek,
            score: best.score,
            reasoning: this._generatePaintingReasoning(best),
            alternative_months: scores
                .filter(s => s.score >= 70 && s.month !== best.month)
                .sort((a, b) => b.score - a.score)
                .slice(0, 2)
                .map(s => s.month_name)
        };
    }

    /**
     * Calculate optimal HVAC service window
     * 
     * Best timing:
     * - Spring (before cooling season): March-April
     * - Fall (before heating season): September-October
     * 
     * @private
     * @param {Object} monthlyPatterns - Monthly climate patterns
     * @param {string} currentDate - Current date
     * @returns {Object} HVAC service recommendation
     */
    static _calculateHvacServiceWindow(monthlyPatterns, currentDate) {
        const currentMonth = new Date(currentDate).getMonth() + 1;

        // Determine next service window
        let nextService;
        if (currentMonth >= 1 && currentMonth <= 4) {
            nextService = { month: 4, month_name: 'April', type: 'pre-cooling' };
        } else if (currentMonth >= 5 && currentMonth <= 9) {
            nextService = { month: 10, month_name: 'October', type: 'pre-heating' };
        } else {
            nextService = { month: 4, month_name: 'April', type: 'pre-cooling' };
        }

        return {
            next_service: nextService.month_name,
            service_type: nextService.type,
            recommended_week: 'Week 2-3',
            reasoning: `Schedule ${nextService.type} HVAC maintenance in ${nextService.month_name} before peak season demand.`,
            annual_schedule: [
                { month: 'April', type: 'pre-cooling', priority: 'high' },
                { month: 'October', type: 'pre-heating', priority: 'high' }
            ]
        };
    }

    /**
     * Calculate optimal pressure washing window
     * 
     * Best conditions:
     * - Moderate temperatures (60-80°F)
     * - Low humidity
     * - After pollen season
     * - Before painting season
     * 
     * @private
     * @param {Object} monthlyPatterns - Monthly climate patterns
     * @param {string} currentDate - Current date
     * @returns {Object} Pressure washing recommendation
     */
    static _calculatePressureWashingWindow(monthlyPatterns, currentDate) {
        const scores = monthlyPatterns.map(month => {
            let score = 100;

            // Temperature range
            if (month.temp_avg < 60 || month.temp_avg > 80) score -= 30;

            // Humidity
            if (month.humidity_avg > 75) score -= 20;

            // Precipitation (want dry period after)
            if (month.precipitation_avg > 4) score -= 15;

            // Prefer spring/fall
            if ([3, 4, 5, 9, 10, 11].includes(month.month)) score += 15;

            return {
                month: month.month,
                month_name: month.month_name,
                score: Math.max(0, score)
            };
        });

        const best = scores.reduce((a, b) => a.score > b.score ? a : b);

        return {
            recommended_month: best.month_name,
            recommended_week: 'Week 2-3',
            score: best.score,
            reasoning: `${best.month_name} offers ideal conditions for pressure washing with moderate temperatures and lower humidity.`
        };
    }

    /**
     * Calculate optimal roof inspection window
     * 
     * Best timing:
     * - After storm season
     * - Before winter
     * - Dry conditions
     * 
     * @private
     * @param {Object} monthlyPatterns - Monthly climate patterns
     * @param {string} currentDate - Current date
     * @returns {Object} Roof inspection recommendation
     */
    static _calculateRoofInspectionWindow(monthlyPatterns, currentDate) {
        // Prefer fall (after hurricane season, before winter)
        const fallMonths = monthlyPatterns.filter(m => [9, 10, 11].includes(m.month));
        const best = fallMonths.reduce((a, b) =>
            a.precipitation_avg < b.precipitation_avg ? a : b
        );

        return {
            recommended_month: best.month_name,
            recommended_week: 'Week 1-2',
            reasoning: `Inspect roof in ${best.month_name} after storm season and before winter weather.`,
            annual_schedule: [
                { month: 'May', reason: 'Post-winter damage check' },
                { month: 'October', reason: 'Pre-winter preparation' }
            ]
        };
    }

    /**
     * Calculate optimal gutter cleaning window
     * 
     * @private
     * @param {Object} monthlyPatterns - Monthly climate patterns
     * @param {string} currentDate - Current date
     * @returns {Object} Gutter cleaning recommendation
     */
    static _calculateGutterCleaningWindow(monthlyPatterns, currentDate) {
        return {
            recommended_months: ['April', 'October'],
            reasoning: 'Clean gutters in spring after pollen/debris and fall after leaves.',
            annual_schedule: [
                { month: 'April', reason: 'Remove winter debris before rainy season' },
                { month: 'October', reason: 'Remove fall leaves before winter' }
            ]
        };
    }

    /**
     * Calculate optimal lawn care window
     * 
     * @private
     * @param {Object} monthlyPatterns - Monthly climate patterns
     * @param {string} currentDate - Current date
     * @returns {Object} Lawn care recommendation
     */
    static _calculateLawnCareWindow(monthlyPatterns, currentDate) {
        const growthMonths = monthlyPatterns.filter(m =>
            m.temp_avg >= 60 && m.temp_avg <= 85
        );

        return {
            fertilization_windows: [
                { month: 'March', type: 'Pre-emergent', priority: 'high' },
                { month: 'June', type: 'Summer feeding', priority: 'medium' },
                { month: 'September', type: 'Fall feeding', priority: 'high' }
            ],
            mowing_season: {
                start: growthMonths[0]?.month_name || 'March',
                end: growthMonths[growthMonths.length - 1]?.month_name || 'November'
            },
            reasoning: 'Fertilize during active growth periods for best results.'
        };
    }

    /**
     * Analyze monthly climate patterns
     * 
     * @private
     * @param {Array} climateData - Climate data
     * @param {Array} normals - Climate normals
     * @returns {Array} Monthly patterns
     */
    static _analyzeMonthlyPatterns(climateData, normals) {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const patterns = [];

        for (let month = 1; month <= 12; month++) {
            const monthData = climateData.filter(d => {
                const date = new Date(d.date);
                return date.getMonth() + 1 === month;
            });

            const temps = monthData.map(d => (d.temp_max + d.temp_min) / 2).filter(Boolean);
            const humidity = monthData.map(d => d.humidity_index).filter(Boolean);
            const precip = monthData.map(d => d.precipitation || 0);
            const swings = monthData
                .filter(d => d.temp_max && d.temp_min)
                .map(d => d.temp_max - d.temp_min);

            patterns.push({
                month,
                month_name: monthNames[month - 1],
                temp_avg: this._average(temps),
                humidity_avg: this._average(humidity),
                precipitation_avg: this._average(precip),
                temp_swing_avg: this._average(swings),
                data_points: monthData.length
            });
        }

        return patterns;
    }

    /**
     * Find best week within a month
     * 
     * @private
     * @param {number} month - Month number
     * @param {Object} monthlyPatterns - Monthly patterns
     * @returns {string} Best week
     */
    static _findBestWeekInMonth(month, monthlyPatterns) {
        // Simplified: recommend week 2-3 for most activities
        // In production, would analyze weekly patterns
        return 'Week 2-3';
    }

    /**
     * Generate painting reasoning
     * 
     * @private
     * @param {Object} monthData - Month data
     * @returns {string} Reasoning
     */
    static _generatePaintingReasoning(monthData) {
        const reasons = [];

        if (monthData.conditions.temperature >= 55 && monthData.conditions.temperature <= 80) {
            reasons.push(`ideal temperature (${monthData.conditions.temperature.toFixed(1)}°F)`);
        }

        if (monthData.conditions.humidity < 70) {
            reasons.push(`low humidity (${monthData.conditions.humidity.toFixed(0)}%)`);
        }

        if (monthData.conditions.precipitation < 3) {
            reasons.push(`minimal rainfall (${monthData.conditions.precipitation.toFixed(1)}" avg)`);
        }

        return `${monthData.month_name} offers ${reasons.join(', ')}.`;
    }

    /**
     * Calculate average
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
     * Calculate confidence
     * 
     * @private
     * @param {number} dataPoints - Number of data points
     * @returns {number} Confidence 0-1
     */
    static _calculateConfidence(dataPoints) {
        if (dataPoints >= 365) return 1.0;
        if (dataPoints >= 180) return 0.9;
        if (dataPoints >= 90) return 0.8;
        return 0.7;
    }
}

module.exports = MaintenanceTimingEngine;
