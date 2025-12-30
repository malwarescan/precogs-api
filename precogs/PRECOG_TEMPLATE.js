/* jshint node: true, esversion: 11 */
/**
 * [Precog Name] Precog Handler
 * Template for creating new precogs
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, existsSync } from "fs";

/**
 * Process [precog name] precog job
 * @param {string} jobId - Job ID
 * @param {string} namespace - Precog namespace
 * @param {string} task - Task type
 * @param {Object} context - Job context (content, region, etc.)
 * @param {Function} emit - Event emitter function
 * @returns {Promise<Object>} Result object
 */
export async function process[PrecogName]Precog(jobId, namespace, task, context, emit) {
  const content = context?.content || "";
  const region = context?.region;

  console.log(`[my-precog] Processing ${namespace}.${task} for job ${jobId}`);

  try {
    await emit("thinking", {
      message: "Processing your request...",
      status: "analyzing",
    });

    // Load corpus data (if needed)
    const data = loadCorpusData(region);

    // Emit grounding event
    await emit("grounding.chunk", {
      count: data.length,
      source: "Corpus data",
      namespace: namespace,
      task: task,
    });

    // Process task
    const result = await executeTask(task, { data, content, region }, emit);

    // Emit answer
    await emitAnswer(result, emit);

    return { success: true, result };
  } catch (error) {
    console.error(`[my-precog] Error:`, error);
    await emit("answer.delta", {
      text: `⚠️ Error: ${error.message}\n`,
    });
    throw error;
  }
}

/**
 * Load corpus data
 * @param {string} region - Optional region filter
 * @returns {Array} Corpus data
 */
function loadCorpusData(region = null) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Standard corpus path (adjust as needed)
    const corpusPath = join(__dirname, '../../corpora/<domain>/<file>.ndjson');
    
    if (!existsSync(corpusPath)) {
      console.warn(`[my-precog] Corpus file not found: ${corpusPath}`);
      return [];
    }
    
    const content = readFileSync(corpusPath, 'utf-8');
    const items = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .filter(item => {
        if (!region) return true;
        return item.region && item.region.toLowerCase() === region.toLowerCase();
      });
    
    console.log(`[my-precog] Loaded ${items.length} items from corpus${region ? ` in ${region}` : ''}`);
    return items;
  } catch (error) {
    console.warn(`[my-precog] Failed to load corpus: ${error.message}`);
    return [];
  }
}

/**
 * Execute task
 * @param {string} task - Task type
 * @param {Object} data - Data and context
 * @param {Function} emit - Event emitter
 * @returns {Promise<Object>} Task result
 */
async function executeTask(task, { data, content, region }, emit) {
  // Task-specific logic here
  return {
    items: data,
    count: data.length,
    task: task,
  };
}

/**
 * Emit answer delta events
 * @param {Object} result - Task result
 * @param {Function} emit - Event emitter
 */
async function emitAnswer(result, emit) {
  await emit("answer.delta", {
    text: `Found ${result.count} items\n\n`,
  });
  
  // Format and emit results
  result.items.forEach((item, idx) => {
    emit("answer.delta", {
      text: `${idx + 1}. **${item.name}**\n`,
    });
  });
}

