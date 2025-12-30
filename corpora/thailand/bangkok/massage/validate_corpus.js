#!/usr/bin/env node

/**
 * Graph Validation Script for Bangkok Massage Intelligence
 * 
 * Validates schema compliance and data quality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CORPUS_DIR = __dirname;

// Allowed districts
const ALLOWED_DISTRICTS = [
  'Asok', 'Nana', 'Phrom Phong', 'Thonglor', 'Ekkamai',
  'Silom', 'Ari', 'Victory Monument', 'Ratchada', 'Old City'
];

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
    .map((line, idx) => {
      try {
        return { data: JSON.parse(line), line: idx + 1, file: filename };
      } catch (e) {
        return { error: e.message, line: idx + 1, file: filename };
      }
    });
}

// Validate MassageShop
function validateMassageShop(shop, file, line) {
  const errors = [];
  const warnings = [];
  
  if (!shop['@type']) {
    errors.push('Missing @type field');
  } else if (shop['@type'] !== 'MassageShop') {
    errors.push(`Invalid @type: ${shop['@type']}, expected MassageShop`);
  }
  
  if (!shop.name) {
    errors.push('Missing required field: name');
  }
  
  if (shop.district && !ALLOWED_DISTRICTS.includes(shop.district)) {
    errors.push(`Invalid district: ${shop.district}. Must be one of: ${ALLOWED_DISTRICTS.join(', ')}`);
  }
  
  if (shop.legit === undefined && file === 'shops_legit.ndjson') {
    warnings.push('legit field not set in shops_legit.ndjson');
  }
  
  if (shop.legit === undefined && file === 'shops_risky.ndjson') {
    warnings.push('legit field not set in shops_risky.ndjson');
  }
  
  return { errors, warnings };
}

// Validate District
function validateDistrict(district, file, line) {
  const errors = [];
  const warnings = [];
  
  if (!district['@type']) {
    errors.push('Missing @type field');
  } else if (district['@type'] !== 'District') {
    errors.push(`Invalid @type: ${district['@type']}, expected District`);
  }
  
  if (!district.name) {
    errors.push('Missing required field: name');
  } else if (!ALLOWED_DISTRICTS.includes(district.name)) {
    errors.push(`Invalid district name: ${district.name}. Must be one of: ${ALLOWED_DISTRICTS.join(', ')}`);
  }
  
  return { errors, warnings };
}

// Validate all entities
function validateCorpus() {
  const validation = {
    generated_at: new Date().toISOString(),
    schema_compliance: 'pending',
    data_quality: 'pending',
    errors: [],
    warnings: [],
    file_stats: {}
  };
  
  // Validate shops_legit.ndjson
  const shopsLegit = loadNDJSON('shops_legit.ndjson');
  validation.file_stats['shops_legit.ndjson'] = shopsLegit.length;
  for (const item of shopsLegit) {
    if (item.error) {
      validation.errors.push({
        file: item.file,
        line: item.line,
        error: `JSON parse error: ${item.error}`
      });
    } else {
      const result = validateMassageShop(item.data, item.file, item.line);
      validation.errors.push(...result.errors.map(e => ({
        file: item.file,
        line: item.line,
        entity: item.data.name || 'unknown',
        error: e
      })));
      validation.warnings.push(...result.warnings.map(w => ({
        file: item.file,
        line: item.line,
        entity: item.data.name || 'unknown',
        warning: w
      })));
    }
  }
  
  // Validate shops_risky.ndjson
  const shopsRisky = loadNDJSON('shops_risky.ndjson');
  validation.file_stats['shops_risky.ndjson'] = shopsRisky.length;
  for (const item of shopsRisky) {
    if (item.error) {
      validation.errors.push({
        file: item.file,
        line: item.line,
        error: `JSON parse error: ${item.error}`
      });
    } else {
      const result = validateMassageShop(item.data, item.file, item.line);
      validation.errors.push(...result.errors.map(e => ({
        file: item.file,
        line: item.line,
        entity: item.data.name || 'unknown',
        error: e
      })));
      validation.warnings.push(...result.warnings.map(w => ({
        file: item.file,
        line: item.line,
        entity: item.data.name || 'unknown',
        warning: w
      })));
    }
  }
  
  // Validate neighborhood_profiles.ndjson
  const districts = loadNDJSON('neighborhood_profiles.ndjson');
  validation.file_stats['neighborhood_profiles.ndjson'] = districts.length;
  for (const item of districts) {
    if (item.error) {
      validation.errors.push({
        file: item.file,
        line: item.line,
        error: `JSON parse error: ${item.error}`
      });
    } else {
      const result = validateDistrict(item.data, item.file, item.line);
      validation.errors.push(...result.errors.map(e => ({
        file: item.file,
        line: item.line,
        entity: item.data.name || 'unknown',
        error: e
      })));
      validation.warnings.push(...result.warnings.map(w => ({
        file: item.file,
        line: item.line,
        entity: item.data.name || 'unknown',
        warning: w
      })));
    }
  }
  
  // Check for duplicate shops
  const allShops = [
    ...shopsLegit.filter(i => !i.error).map(i => i.data.name),
    ...shopsRisky.filter(i => !i.error).map(i => i.data.name)
  ];
  const duplicates = allShops.filter((name, idx) => allShops.indexOf(name) !== idx);
  if (duplicates.length > 0) {
    validation.warnings.push({
      file: 'all',
      warning: `Duplicate shop names found: ${[...new Set(duplicates)].join(', ')}`
    });
  }
  
  // Set overall status
  validation.schema_compliance = validation.errors.length === 0 ? 'pass' : 'fail';
  validation.data_quality = validation.warnings.length === 0 ? 'good' : 'warnings';
  
  return validation;
}

// Main execution
function main() {
  console.log('Validating Bangkok Massage Intelligence corpus...\n');
  
  const validation = validateCorpus();
  
  // Write validation report
  const reportFile = path.join(CORPUS_DIR, 'validation_report.json');
  fs.writeFileSync(reportFile, JSON.stringify(validation, null, 2));
  
  console.log('Validation Results:');
  console.log('==================');
  console.log(`Schema Compliance: ${validation.schema_compliance.toUpperCase()}`);
  console.log(`Data Quality: ${validation.data_quality}`);
  console.log(`Errors: ${validation.errors.length}`);
  console.log(`Warnings: ${validation.warnings.length}`);
  console.log('\nFile Statistics:');
  for (const [file, count] of Object.entries(validation.file_stats)) {
    console.log(`  ${file}: ${count} entities`);
  }
  
  if (validation.errors.length > 0) {
    console.log('\nErrors:');
    validation.errors.slice(0, 10).forEach(err => {
      console.log(`  [${err.file}:${err.line}] ${err.error}`);
    });
    if (validation.errors.length > 10) {
      console.log(`  ... and ${validation.errors.length - 10} more errors`);
    }
  }
  
  if (validation.warnings.length > 0) {
    console.log('\nWarnings:');
    validation.warnings.slice(0, 10).forEach(warn => {
      console.log(`  [${warn.file}:${warn.line}] ${warn.warning}`);
    });
    if (validation.warnings.length > 10) {
      console.log(`  ... and ${validation.warnings.length - 10} more warnings`);
    }
  }
  
  console.log(`\nValidation report written to: ${reportFile}`);
  
  // Exit with error code if validation failed
  if (validation.schema_compliance === 'fail') {
    process.exit(1);
  }
}

main();

