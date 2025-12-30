/**
 * Environmental Home Risk Oracle
 * 
 * CASA-compliant oracle for conversational homeowner Q&A about environmental risks.
 * REF: Casa Core Reasoning Directive
 * 
 * Compliance Rules:
 * 1. No risk scores or labels
 * 2. No warnings or alert language
 * 3. No checklists or "recommended steps"
 * 4. No temporal directives ("when to")
 * 5. Explanatory, neutral, place-specific tone
 * 
 * @module environmental_home_risk
 */

const RiskFactorsEngine = require('../models/riskFactors');
const MaintenanceTimingEngine = require('../models/maintenanceTiming');

class EnvironmentalHomeRiskOracle {
    constructor(graphClient) {
        this.graphClient = graphClient;
    }

    /**
     * Process homeowner question and return CASA-compliant response
     * 
     * @param {Object} request - CASA request
     * @param {string} request.question - Homeowner's question
     * @param {string} request.zip - ZIP code (required)
     * @param {Object} request.home_context - Optional home details
     * @returns {Promise<Object>} CASA-formatted response
     */
    async ask(request) {
        const { question, zip, home_context = {} } = request;

        // Validation
        if (!question || !question.trim()) {
            return this._errorResponse('Please provide a specific query regarding the home environment.');
        }

        if (!zip || !/^\d{5}(-\d{4})?$/.test(zip)) {
            return this._errorResponse('Valid ZIP code required for location context.');
        }

        try {
            // 1. Fetch climate data
            const climateData = await this._fetchClimateData(zip);

            if (climateData.length === 0) {
                return this._errorResponse(`Context unavailable for ${zip}. Data coverage is expanding.`);
            }

            // 2. Classify intent
            const intent = this._classifyQuestion(question);

            // 3. Calculate metrics (internal use only)
            const risks = RiskFactorsEngine.calculateRisks(climateData, {
                siding_material: home_context.siding_material || 'vinyl',
                roof_age: home_context.roof_age || 10,
                structure_type: home_context.structure_type || 'single_family'
            });

            const maintenance = MaintenanceTimingEngine.calculateMaintenanceWindows(
                climateData,
                [],
                new Date().toISOString().split('T')[0]
            );

            // 4. Generate compliant response
            return this._generateResponse(intent, risks, maintenance, climateData, zip, home_context);

        } catch (error) {
            console.error('[oracle] Error:', error);
            return this._errorResponse('System encountered a processing error.');
        }
    }

    _classifyQuestion(question) {
        const q = question.toLowerCase();
        if (q.match(/mold|mildew|moisture|damp|humid/)) return 'mold';
        if (q.match(/paint|exterior|finish/)) return 'painting';
        if (q.match(/roof|shingle|leak/)) return 'roof';
        if (q.match(/siding|warp|expand|cladding/)) return 'siding';
        if (q.match(/hvac|ac|heat|cool|air/)) return 'hvac';
        if (q.match(/flood|water|drain|storm/)) return 'flood';
        return 'general';
    }

    _generateResponse(intent, risks, maintenance, climateData, zip, context) {
        // Dispatch to specific topic generators
        switch (intent) {
            case 'mold': return this._moldResponse(risks, climateData, zip);
            case 'painting': return this._paintingResponse(maintenance, climateData, zip);
            case 'roof': return this._roofResponse(risks, climateData, zip);
            case 'siding': return this._sidingResponse(risks, climateData, zip, context);
            case 'hvac': return this._hvacResponse(maintenance, risks, zip);
            case 'flood': return this._floodResponse(risks, climateData, zip);
            default: return this._generalResponse(risks, zip);
        }
    }

    // =========================================================================
    // TOPIC GENERATORS (COMPLIANT)
    // =========================================================================

    _moldResponse(risks, climateData, zip) {
        const dewPointAvg = this._average(climateData.map(d => d.dew_point).filter(Boolean));
        const humidityAvg = this._average(climateData.map(d => d.humidity_index).filter(Boolean));
        const riskLevel = risks.mold_risk > 0.6 ? 'elevated' : 'moderate';

        return {
            ok: true,
            location_context: `${zip} maintains an average dew point of ${dewPointAvg.toFixed(1)}°F and humidity of ${humidityAvg.toFixed(0)}%. This creates a vapor pressure profile where ambient moisture persists in the air for extended periods.`,
            condition_interaction: `When outdoor humidity remains high, building envelopes absorb moisture rather than expelling it. Interior spaces with limited airflow accumulate water vapor, which condenses on cooler surfaces like drywall backing or window framing.`,
            failure_modes: `Porous materials including gypsum board and untreated wood framing absorb excess environmental moisture. In the absence of active dehumidification, this saturation supports fungal proliferation within wall cavities and attics.`,
            why_missed: `Moisture accumulation occurs primarily within enclosed structural cavities or behind insulation, making it invisible to casual observation. Occupational patterns often mask high humidity levels until visible staining occurs.`,
            context_matters: `The local hygric load implies that passive ventilation is often insufficient. Long-term structural integrity in this zone relies on mechanical moisture control to counteract the ambient vapor drive.`,
            source: "precogs"
        };
    }

    _paintingResponse(maintenance, climateData, zip) {
        const bestTime = maintenance.painting.recommended_month;
        const avgTemp = this._average(climateData.map(d => d.temp_avg).filter(Boolean));

        return {
            ok: true,
            location_context: `The climate index for ${zip} creates specific chemical curing windows, most notably around ${bestTime}. Average annual temperatures of ${avgTemp.toFixed(1)}°F define the baseline coating stress.`,
            condition_interaction: `Exterior coatings depend on solvent evaporation rates that match the binder's curing speed. High humidity slows evaporation, while extreme heat accelerates it, both of which compromise the chemical bond to the substrate.`,
            failure_modes: `Improper curing leads to micro-cracking and loss of adhesion (blistering). When applied outside the optimal hygric window, the film forms a weak interface that detaches as the substrate expands and contracts.`,
            why_missed: `Application timing is often driven by contractor availability or personal schedules rather than meteorological suitability. Immediate visual appearance does not indicate successful chemical bonding.`,
            context_matters: `Aligning maintenance with the ${bestTime} stabilization window maximizes the service life of the coating. This synchronization reduces the frequency of comprehensive remediation cycles.`,
            source: "precogs"
        };
    }

    _roofResponse(risks, climateData, zip) {
        const precipTotal = climateData.reduce((s, d) => s + (d.precipitation || 0), 0);

        return {
            ok: true,
            location_context: `${zip} receives ${precipTotal.toFixed(1)} inches of annual precipitation. The roof system operates as the primary hydraulic barrier against this recurring environmental load.`,
            condition_interaction: `Recurring wetting and drying cycles degrade asphalt granule adhesion. When combined with UV exposure, the binding agents in shingles become brittle, reducing their ability to remain sealed during wind events.`,
            failure_modes: `Water intrusion typically begins at penetration points (vents, chimneys) or valley flashings where flow volume is highest. Saturation of the underlying decking leads to delamination and loss of structural rigidity.`,
            why_missed: `Roof planes are generally viewed from the ground, obscuring granular loss and minor sealant failures. Leaks often travel along rafters before manifesting on interior ceilings, distancing the symptom from the source.`,
            context_matters: `The cumulative hydraulic load in this area necessitates a focus on drainage efficiency. The longevity of the roofing system is directly correlated to the management of shedding volume.`,
            source: "precogs"
        };
    }

    _sidingResponse(risks, climateData, zip, context) {
        const material = context.siding_material || 'cladding';
        const tempSwings = this._calculateTempSwings(climateData);

        return {
            ok: true,
            location_context: `Daily thermal oscillations in ${zip} average ${tempSwings.toFixed(1)}°F. This thermal cycling dictates the movement patterns of exterior ${material} assemblies.`,
            condition_interaction: `${material.charAt(0).toUpperCase() + material.slice(1)} responds to temperature changes by expanding and contracting. Without adequate tolerance gaps, this kinetic energy transfers to fasteners and adjacent panels.`,
            failure_modes: `Restricted movement results in bowing, buckling, or the shearing of fastener heads. Over time, these deformations create gaps that allow wind-driven rain to bypass the weather-resistive barrier.`,
            why_missed: `Thermal movement is slow and incremental. Early signs of stress, such as slight waving in the profile, are often interpreted as installation aesthetics rather than mechanical strain.`,
            context_matters: `Accommodating this thermal range is critical for envelope watertightness. The performance of the siding system depends on its ability to float freely over the substrate during daily temperature peaks.`,
            source: "precogs"
        };
    }

    _hvacResponse(maintenance, risks, zip) {
        const seasonalLoad = risks.hvac_seasonal_load || 'variable';

        return {
            ok: true,
            location_context: `The thermodynamic load in ${zip} places specific seasonal demands on heat exchange systems. The ${seasonalLoad} load profile defines the operating duty cycle.`,
            condition_interaction: `Components operate under sustained thermal pressure during peak seasons. Heat exchangers and compressors degrade more rapidly when airflow is restricted by particulate accumulation on filtration media.`,
            failure_modes: `System inefficiency manifests as compressor overheating or frozen evaporator coils. These mechanical failures are often preceded by a gradual reduction in thermal transfer capacity.`,
            why_missed: `Performance degradation occurs linearly, making it imperceptible to daily occupants. Systems often continue to run despite compromised efficiency until a critical component fails.`,
            context_matters: `Operational stability in this climate requires preserving airflow dynamics. The service life of the mechanical plant is a function of its ability to reject heat without excessive head pressure.`,
            source: "precogs"
        };
    }

    _floodResponse(risks, climateData, zip) {
        const precipTotal = climateData.reduce((s, d) => s + (d.precipitation || 0), 0);

        return {
            ok: true,
            location_context: `Hydrologic patterns in ${zip} include ${precipTotal.toFixed(1)} inches of annual rainfall. The local topography defines how this volume moves across the landscape.`,
            condition_interaction: `Saturated soil loses its capacity for infiltration during rapid accumulation events. Surface water then follows the path of least resistance, which often leads toward sub-grade structures or foundation perimeters.`,
            failure_modes: `Hydrostatic pressure builds against foundation walls, forcing water through capillary networks in concrete or masonry. This intrusion compromises the conditioned space and introduces uncontrolled moisture.`,
            why_missed: `Drainage patterns are dynamic and only visible during active precipitation. Dry conditions mask the evidence of historical flow paths and temporary pooling.`,
            context_matters: `Management of surface water is the primary defense against foundation instability. The relationship between grade elevation and structure determines the long-term moisture liability.`,
            source: "precogs"
        };
    }

    _generalResponse(risks, zip) {
        return {
            ok: true,
            location_context: `The distinct microclimate of ${zip} imposes a unique set of environmental forces on residential structures. These forces include thermal cycling, humidity loads, and precipitation volumes.`,
            condition_interaction: `Building materials exist in a state of continuous interaction with these atmospheric conditions. Wood, concrete, and polymers degrade at rates determined by their exposure to UV radiation and moisture fluctuations.`,
            failure_modes: `The primary mechanism of degradation is the cumulative effect of small stressors. Sealant failures, microscopic cracking, and chemical breakdown allow the environment to bypass the building envelope.`,
            why_missed: `Degradation is rarely catastrophic in its early stages. The slow progression of material fatigue allows minor issues to accumulate without triggering immediate concern.`,
            context_matters: `Understanding the local environmental load explains the baseline maintenance requirement. A proactive stance aligns building performance with the physical realities of the location.`,
            source: "precogs"
        };
    }

    _errorResponse(message) {
        return {
            ok: false,
            error: message,
            source: "precogs"
        };
    }

    // =========================================================================
    // DATA HELPERS
    // =========================================================================

    async _fetchClimateData(zip) {
        try {
            const response = await this.graphClient.query({
                corpus: 'environmental.local_climate',
                q: zip,
                limit: 1000
            });
            return response.results.map(r => r.triple || r.normalized || {}).filter(d => d.date);
        } catch (error) {
            console.error('[oracle] Fetch error:', error);
            return [];
        }
    }

    _calculateTempSwings(climateData) {
        const swings = climateData
            .filter(d => d.temp_max && d.temp_min)
            .map(d => d.temp_max - d.temp_min);
        return this._average(swings);
    }

    _average(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
}

module.exports = EnvironmentalHomeRiskOracle;
