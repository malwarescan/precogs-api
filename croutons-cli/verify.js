#!/usr/bin/env node

// Final pre-publish verification script
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_DIR = join(__dirname, '..');

console.log('🔍 Final Pre-Publish Checks\n');

let passed = 0;
let failed = 0;

function check(name, condition, message) {
  if (condition) {
    console.log(`✅ ${name}: ${message}`);
    passed++;
  } else {
    console.log(`❌ ${name}: ${message}`);
    failed++;
  }
}

// 1. Check shebang
const binFile = join(CLI_DIR, 'bin', 'croutons-init.js');
const binContent = readFileSync(binFile, 'utf8');
check('Shebang', binContent.startsWith('#!/usr/bin/env node'), 'bin/croutons-init.js starts with #!/usr/bin/env node');

// 2. Check package.json files array
const packageJson = JSON.parse(readFileSync(join(CLI_DIR, 'package.json'), 'utf8'));
const expectedFiles = ['bin', 'templates', 'README.md', 'package.json'];
const hasAllFiles = expectedFiles.every(f => packageJson.files?.includes(f));
check('Files array', hasAllFiles, `package.json.files includes: ${expectedFiles.join(', ')}`);

// 3. Check engines
check('Engines', packageJson.engines?.node === '>=18.0.0', 'package.json specifies node >=18.0.0');

// 4. Check bin entry
check('Bin entry', packageJson.bin?.['croutons-init'] === './bin/croutons-init.js', 'package.json.bin.croutons-init is correct');

// 5. Check generated package.json includes type: module
const templatePath = join(CLI_DIR, 'bin', 'croutons-init.js');
const cliContent = readFileSync(templatePath, 'utf8');
check('Generated package.json', cliContent.includes('type: \'module\''), 'CLI ensures generated package.json has type: module');

// 6. Check SDK template has proper exports
const sdkTemplate = readFileSync(join(CLI_DIR, 'templates', 'sdk', 'index.js.template'), 'utf8');
check('SDK exports', sdkTemplate.includes('export async function sendFactlet') && sdkTemplate.includes('export async function sendBatchFacts'), 'SDK template exports sendFactlet and sendBatchFacts');

// 7. Check example template uses replaceAll
check('Template replacement', cliContent.includes('replaceAll'), 'CLI uses replaceAll for template replacement');

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\n✅ All checks passed! Ready to publish.\n');

