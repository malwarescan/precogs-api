import { createHash } from 'crypto';
import { gzipSync } from 'zlib';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lazy load config on first use
let _configCache = null;
async function getConfig() {
  if (_configCache) return _configCache;
  try {
    const configPath = join(__dirname, '..', 'croutons.config.js');
    const configModule = await import(configPath);
    _configCache = configModule.default;
    return _configCache;
  } catch (e) {
    throw new Error('Could not load croutons.config.js. Make sure it exists in the project root.');
  }
}

function sha256(str) {
  return createHash('sha256').update(str).digest('hex');
}

/**
 * Send a single factlet to the Croutons ingestion API
 * @param {Object} factlet - The factlet object (Page, Passage, TablePassage, or Factlet)
 * @returns {Promise<Object>} Response from the API
 */
export async function sendFactlet(factlet) {
  const config = await getConfig();
  const line = JSON.stringify(factlet) + '\n';
  const gzipped = gzipSync(line);
  const contentHash = sha256(line);

  const url = `${config.apiUrl}/v1/streams/ingest`;
  
  const res = await fetch(url, {
    method: 'POST',
    body: gzipped,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'X-Dataset-Id': config.datasetId,
      'X-Site': config.site,
      'X-Content-Hash': `sha256:${contentHash}`,
      'X-Schema-Version': '1',
      'Content-Type': 'application/x-ndjson',
      'Content-Encoding': 'gzip'
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorText}`);
  }

  return await res.json();
}

/**
 * Send multiple factlets in a batch
 * @param {Array<Object>} factlets - Array of factlet objects
 * @returns {Promise<Object>} Response from the API
 */
export async function sendBatchFacts(factlets) {
  const config = await getConfig();
  if (!Array.isArray(factlets) || factlets.length === 0) {
    throw new Error('factlets must be a non-empty array');
  }

  const ndjson = factlets.map(f => JSON.stringify(f)).join('\n') + '\n';
  const gzipped = gzipSync(ndjson);
  const contentHash = sha256(ndjson);

  const url = `${config.apiUrl}/v1/streams/ingest`;
  
  const res = await fetch(url, {
    method: 'POST',
    body: gzipped,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'X-Dataset-Id': config.datasetId,
      'X-Site': config.site,
      'X-Content-Hash': `sha256:${contentHash}`,
      'X-Schema-Version': '1',
      'Content-Type': 'application/x-ndjson',
      'Content-Encoding': 'gzip'
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorText}`);
  }

  return await res.json();
}

// Export config getter for advanced usage
export { getConfig };

