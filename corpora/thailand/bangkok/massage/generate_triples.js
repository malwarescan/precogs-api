#!/usr/bin/env node

/**
 * Triple Generation Script for Bangkok Massage Intelligence
 * 
 * Generates triples from NDJSON factlets following the linking rules:
 * - Shop → District (located_in)
 * - Shop → Safety Signals (has_safety_signal)
 * - Shop → Risk Factors (has_risk_factor)
 * - District → Price Tier (has_price_band)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CORPUS_DIR = __dirname;

// Load all NDJSON files
function loadNDJSON(filename) {
  const filepath = path.join(CORPUS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return [];
  }
  const content = fs.readFileSync(filepath, 'utf-8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

// Generate triples
function generateTriples() {
  const triples = [];
  
  // Load data
  const shopsLegit = loadNDJSON('shops_legit.ndjson');
  const shopsRisky = loadNDJSON('shops_risky.ndjson');
  const districts = loadNDJSON('neighborhood_profiles.ndjson');
  const pricingTiers = loadNDJSON('pricing_tiers.ndjson');
  const safetySignals = loadNDJSON('safety_signals.ndjson');
  const scamPatterns = loadNDJSON('scam_patterns.ndjson');
  const femaleSafe = loadNDJSON('female_safe_spaces.ndjson');
  
  // Shop → District (located_in)
  for (const shop of [...shopsLegit, ...shopsRisky]) {
    if (shop.district) {
      triples.push({
        "@type": "Triple",
        subject: shop.name,
        predicate: "located_in",
        object: shop.district
      });
    }
  }
  
  // Shop → Safety Signals (has_safety_signal)
  for (const shop of shopsLegit) {
    if (shop.strengths && Array.isArray(shop.strengths)) {
      for (const signalName of shop.strengths) {
        triples.push({
          "@type": "Triple",
          subject: shop.name,
          predicate: "has_safety_signal",
          object: signalName
        });
      }
    }
  }
  
  // Shop → Risk Factors (has_risk_factor)
  for (const shop of shopsRisky) {
    if (shop.risk_factors && Array.isArray(shop.risk_factors)) {
      for (const riskName of shop.risk_factors) {
        triples.push({
          "@type": "Triple",
          subject: shop.name,
          predicate: "has_risk_factor",
          object: riskName
        });
      }
    }
  }
  
  // District → Price Tier (has_price_band)
  for (const tier of pricingTiers) {
    if (tier.district) {
      const priceBand = {
        massage_type: tier.massage_type,
        price_low: tier.price_low,
        price_high: tier.price_high,
        price_typical: tier.price_typical,
        currency: tier.currency
      };
      triples.push({
        "@type": "Triple",
        subject: tier.district,
        predicate: "has_price_band",
        object: JSON.stringify(priceBand)
      });
    }
  }
  
  // Female Safe Spaces → Shop (is_verified_safe_for)
  for (const safeShop of femaleSafe) {
    if (safeShop.verified_safe_female && safeShop.name) {
      triples.push({
        "@type": "Triple",
        subject: safeShop.name,
        predicate: "is_verified_safe_for",
        object: "solo_female_travelers"
      });
    }
  }
  
  return triples;
}

// Main execution
function main() {
  console.log('Generating triples from Bangkok Massage Intelligence corpus...\n');
  
  const triples = generateTriples();
  
  // Write triples to NDJSON file
  const triplesFile = path.join(CORPUS_DIR, 'triples.ndjson');
  const triplesContent = triples.map(t => JSON.stringify(t)).join('\n');
  fs.writeFileSync(triplesFile, triplesContent + '\n');
  
  // Generate report
  const report = {
    generated_at: new Date().toISOString(),
    total_triples: triples.length,
    triple_types: {
      located_in: triples.filter(t => t.predicate === 'located_in').length,
      has_safety_signal: triples.filter(t => t.predicate === 'has_safety_signal').length,
      has_risk_factor: triples.filter(t => t.predicate === 'has_risk_factor').length,
      has_price_band: triples.filter(t => t.predicate === 'has_price_band').length,
      is_verified_safe_for: triples.filter(t => t.predicate === 'is_verified_safe_for').length
    }
  };
  
  const reportFile = path.join(CORPUS_DIR, 'triple_generation_report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`Generated ${triples.length} triples`);
  console.log(`- located_in: ${report.triple_types.located_in}`);
  console.log(`- has_safety_signal: ${report.triple_types.has_safety_signal}`);
  console.log(`- has_risk_factor: ${report.triple_types.has_risk_factor}`);
  console.log(`- has_price_band: ${report.triple_types.has_price_band}`);
  console.log(`- is_verified_safe_for: ${report.triple_types.is_verified_safe_for}`);
  console.log(`\nTriples written to: ${triplesFile}`);
  console.log(`Report written to: ${reportFile}`);
}

main();

