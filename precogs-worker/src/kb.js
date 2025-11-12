/* jshint node: true, esversion: 11 */
/**
 * Knowledge Base Loader
 * Loads KB rules, types, examples, and templates from the kb/ directory
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load a Knowledge Base by name
 * @param {string} name - KB name (e.g., 'schema-foundation')
 * @returns {Object} KB object with kb, types, base path
 */
export function loadKB(name = "schema-foundation") {
  const base = path.resolve(__dirname, "..", "kb", name);

  if (!fs.existsSync(base)) {
    console.warn(`[kb] KB directory not found: ${base}`);
    return { kb: null, types: {}, base };
  }

  // Load main KB config
  const kbPath = path.join(base, "kb.json");
  let kb = null;
  if (fs.existsSync(kbPath)) {
    try {
      kb = JSON.parse(fs.readFileSync(kbPath, "utf-8"));
      console.log(`[kb] Loaded KB: ${name} v${kb.version || "unknown"}`);
    } catch (e) {
      console.error(`[kb] Failed to load kb.json:`, e.message);
    }
  }

  // Load type rules
  const typesDir = path.join(base, "types");
  const types = {};

  if (fs.existsSync(typesDir)) {
    try {
      const files = fs.readdirSync(typesDir);
      for (const f of files) {
        if (f.endsWith(".json")) {
          try {
            const specPath = path.join(typesDir, f);
            const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));
            types[spec.type] = { ...spec, __base: base };
            console.log(`[kb] Loaded type rules: ${spec.type}`);
          } catch (e) {
            console.warn(`[kb] Failed to load type ${f}:`, e.message);
          }
        }
      }
    } catch (e) {
      console.warn(`[kb] Failed to read types directory:`, e.message);
    }
  }

  return { kb, types, base };
}

/**
 * Get example for a type
 * @param {string} kbBase - KB base path
 * @param {string} type - Schema type
 * @param {string} exampleType - 'good', 'minimal', or 'bad'
 * @returns {Object|null} Example JSON-LD or null
 */
export function loadExample(kbBase, type, exampleType = "good") {
  const examplePath = path.join(kbBase, "examples", `${type}.${exampleType}.jsonld`);
  if (!fs.existsSync(examplePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(examplePath, "utf-8"));
  } catch (e) {
    console.warn(`[kb] Failed to load example ${examplePath}:`, e.message);
    return null;
  }
}

/**
 * Load template for a type
 * @param {string} kbBase - KB base path
 * @param {string} type - Schema type
 * @returns {string|null} Template content or null
 */
export function loadTemplate(kbBase, type) {
  const templatePath = path.join(kbBase, "templates", `${type}.hbs`);
  if (!fs.existsSync(templatePath)) {
    return null;
  }
  try {
    return fs.readFileSync(templatePath, "utf-8");
  } catch (e) {
    console.warn(`[kb] Failed to load template ${templatePath}:`, e.message);
    return null;
  }
}

