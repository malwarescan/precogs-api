#!/usr/bin/env node
/* jshint node: true, esversion: 11 */
/**
 * Master Ingestion Script - All Precogs
 * 
 * Ingests all precog corpus data into the Croutons graph service.
 * 
 * This script runs all ingestion processes:
 * 1. Bangkok Massage corpus (bkk_massage)
 * 2. Home domain external feeds (ourcasa.ai, floodbarrierpros.com)
 * 
 * Usage:
 *   export PUBLISH_HMAC_KEY="your-key"
 *   node ingest-all-precogs.js
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GRAPH_BASE = process.env.GRAPH_BASE || "https://graph.croutons.ai";
const HMAC_SECRET = process.env.PUBLISH_HMAC_KEY || process.env.HMAC_SECRET || "dev-secret";

console.log("=== CRoutons Graph Ingestion - All Precogs ===\n");
console.log(`Graph Service: ${GRAPH_BASE}`);
console.log(`HMAC Secret: ${HMAC_SECRET.substring(0, 8)}...`);
console.log("");

// Ingestion tasks
const ingestionTasks = [];

// 1. Bangkok Massage Corpus
const bkkMassageScript = join(__dirname, "../corpora/thailand/bangkok/massage/ingest_to_graph.js");
if (existsSync(bkkMassageScript)) {
  ingestionTasks.push({
    name: "Bangkok Massage (bkk_massage)",
    script: bkkMassageScript,
    description: "Ingests corpus files: shops, pricing, districts, safety signals, etc.",
  });
} else {
  console.warn("⚠️  Bangkok Massage ingestion script not found:", bkkMassageScript);
}

// 2. Home Domain External Feeds
const homeSourcesScript = join(__dirname, "precogs-api/precogs-worker/scripts/ingest-home-sources.js");
if (existsSync(homeSourcesScript)) {
  ingestionTasks.push({
    name: "Home Domain Sources (ourcasa.ai, floodbarrierpros.com)",
    script: homeSourcesScript,
    description: "Ingests external NDJSON feeds from partner sites",
  });
} else {
  console.warn("⚠️  Home sources ingestion script not found:", homeSourcesScript);
}

// Run all ingestion tasks
async function runAllIngestions() {
  console.log(`Found ${ingestionTasks.length} ingestion tasks:\n`);
  
  ingestionTasks.forEach((task, i) => {
    console.log(`${i + 1}. ${task.name}`);
    console.log(`   ${task.description}`);
    console.log(`   Script: ${task.script}`);
    console.log("");
  });

  let successCount = 0;
  let failCount = 0;

  for (const task of ingestionTasks) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Running: ${task.name}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      // Convert path to file:// URL for import
      const scriptUrl = task.script.startsWith('/') 
        ? `file://${task.script}`
        : `file://${process.cwd()}/${task.script}`;
      
      // Import and run the ingestion script
      const module = await import(scriptUrl);
      
      if (typeof module.main === "function") {
        await module.main();
        successCount++;
        console.log(`\n✅ ${task.name} completed successfully\n`);
      } else {
        console.error(`❌ ${task.name}: Script does not export a main() function`);
        console.error(`   Available exports: ${Object.keys(module).join(', ')}`);
        failCount++;
      }
    } catch (error) {
      console.error(`\n❌ ${task.name} failed:`, error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      failCount++;
    }

    // Small delay between tasks
    if (ingestionTasks.indexOf(task) < ingestionTasks.length - 1) {
      console.log("Waiting 2 seconds before next task...\n");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("=== Ingestion Summary ===");
  console.log(`${"=".repeat(60)}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Total: ${ingestionTasks.length}`);
  console.log("");
  console.log(`📊 Check dashboard: ${GRAPH_BASE}/dashboard.html`);
  console.log("");
}

// Check prerequisites
if (!HMAC_SECRET || HMAC_SECRET === "dev-secret") {
  console.warn("⚠️  WARNING: PUBLISH_HMAC_KEY not set or using default 'dev-secret'");
  console.warn("   Set it with: export PUBLISH_HMAC_KEY='your-key-from-railway'");
  console.warn("");
}

if (ingestionTasks.length === 0) {
  console.error("❌ No ingestion tasks found. Check script paths.");
  process.exit(1);
}

// Run
runAllIngestions().catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

