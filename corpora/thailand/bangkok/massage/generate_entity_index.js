#!/usr/bin/env node

/**
 * Entity Index Summary Script for Bangkok Massage Intelligence
 * 
 * Generates entity index summary with counts by type
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

// Generate entity index
function generateEntityIndex() {
  const shopsLegit = loadNDJSON('shops_legit.ndjson');
  const shopsRisky = loadNDJSON('shops_risky.ndjson');
  const districts = loadNDJSON('neighborhood_profiles.ndjson');
  const pricingTiers = loadNDJSON('pricing_tiers.ndjson');
  const safetySignals = loadNDJSON('safety_signals.ndjson');
  const scamPatterns = loadNDJSON('scam_patterns.ndjson');
  const etiquette = loadNDJSON('etiquette.ndjson');
  const femaleSafe = loadNDJSON('female_safe_spaces.ndjson');
  
  // Build entity index
  const entities = {
    MassageShop: {
      legitimate: shopsLegit.map(s => s.name),
      risky: shopsRisky.map(s => s.name),
      total: shopsLegit.length + shopsRisky.length
    },
    District: districts.map(d => d.name),
    SafetySignal: safetySignals.map(s => s.name),
    ScamPattern: scamPatterns.map(s => s.name),
    EtiquetteRule: etiquette.map(e => e.category),
    PriceTier: pricingTiers.length,
    FemaleSafeSpace: femaleSafe.map(s => s.name)
  };
  
  // Generate summary
  const summary = {
    generated_at: new Date().toISOString(),
    corpus_path: CORPUS_DIR,
    entity_counts: {
      MassageShop: {
        legitimate: shopsLegit.length,
        risky: shopsRisky.length,
        total: shopsLegit.length + shopsRisky.length
      },
      District: districts.length,
      SafetySignal: safetySignals.length,
      ScamPattern: scamPatterns.length,
      EtiquetteRule: etiquette.length,
      PriceTier: pricingTiers.length,
      FemaleSafeSpace: femaleSafe.length
    },
    primary_entity: "MassageShop",
    entities: entities
  };
  
  return summary;
}

// Main execution
function main() {
  console.log('Generating entity index summary...\n');
  
  const summary = generateEntityIndex();
  
  // Write summary to JSON file
  const summaryFile = path.join(CORPUS_DIR, 'entity_index_summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log('Entity Index Summary:');
  console.log('====================');
  console.log(`MassageShop (legitimate): ${summary.entity_counts.MassageShop.legitimate}`);
  console.log(`MassageShop (risky): ${summary.entity_counts.MassageShop.risky}`);
  console.log(`MassageShop (total): ${summary.entity_counts.MassageShop.total}`);
  console.log(`District: ${summary.entity_counts.District}`);
  console.log(`SafetySignal: ${summary.entity_counts.SafetySignal}`);
  console.log(`ScamPattern: ${summary.entity_counts.ScamPattern}`);
  console.log(`EtiquetteRule: ${summary.entity_counts.EtiquetteRule}`);
  console.log(`PriceTier: ${summary.entity_counts.PriceTier}`);
  console.log(`FemaleSafeSpace: ${summary.entity_counts.FemaleSafeSpace}`);
  console.log(`\nPrimary Entity: ${summary.primary_entity}`);
  console.log(`\nSummary written to: ${summaryFile}`);
}

main();

