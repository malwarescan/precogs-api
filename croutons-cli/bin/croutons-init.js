#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '..', 'templates');

async function main() {
  console.log('\n🚀 Croutons Satellite Initializer\n');
  
  // Check if files already exist
  const configPath = join(process.cwd(), 'croutons.config.js');
  if (existsSync(configPath)) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: 'croutons.config.js already exists. Overwrite?',
      default: false
    }]);
    if (!overwrite) {
      console.log('Cancelled.');
      process.exit(0);
    }
  }

  // Prompt for configuration
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'datasetId',
      message: 'Dataset ID (e.g., my-site):',
      default: 'my-site',
      validate: (input) => input.trim().length > 0 || 'Dataset ID is required'
    },
    {
      type: 'input',
      name: 'site',
      message: 'Site URL (e.g., https://mysite.com):',
      default: 'https://mysite.com',
      validate: (input) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      }
    },
    {
      type: 'input',
      name: 'apiKey',
      message: 'API Key (grph_xxx):',
      default: 'grph_xxx',
      validate: (input) => input.trim().length > 0 || 'API Key is required'
    },
    {
      type: 'input',
      name: 'apiUrl',
      message: 'API URL:',
      default: 'https://graph.croutons.ai'
    },
    {
      type: 'confirm',
      name: 'includeDocker',
      message: 'Include Docker Compose for local testing?',
      default: false
    }
  ]);

  // Generate files
  console.log('\n📦 Generating files...\n');

  // 1. Config file
  const configTemplate = readFileSync(join(TEMPLATES_DIR, 'croutons.config.js.template'), 'utf8');
  const configContent = configTemplate
    .replace('{{API_URL}}', answers.apiUrl)
    .replace('{{API_KEY}}', answers.apiKey)
    .replace('{{DATASET_ID}}', answers.datasetId)
    .replace('{{SITE}}', answers.site);
  writeFileSync(configPath, configContent);
  console.log('✔ Created croutons.config.js');

  // 2. SDK directory
  const sdkDir = join(process.cwd(), 'croutons-sdk');
  if (!existsSync(sdkDir)) {
    mkdirSync(sdkDir, { recursive: true });
  }
  
  const sdkTemplate = readFileSync(join(TEMPLATES_DIR, 'sdk', 'index.js.template'), 'utf8');
  writeFileSync(join(sdkDir, 'index.js'), sdkTemplate);
  console.log('✔ Created croutons-sdk/index.js');

  // 3. Examples directory
  const examplesDir = join(process.cwd(), 'examples');
  if (!existsSync(examplesDir)) {
    mkdirSync(examplesDir, { recursive: true });
  }
  
  const exampleTemplate = readFileSync(join(TEMPLATES_DIR, 'examples', 'send-facts.js.template'), 'utf8');
  const exampleContent = exampleTemplate.replaceAll('{{SITE}}', answers.site);
  writeFileSync(join(examplesDir, 'send-facts.js'), exampleContent);
  console.log('✔ Created examples/send-facts.js');

  // 4. Docker Compose (optional)
  if (answers.includeDocker) {
    const dockerTemplate = readFileSync(join(TEMPLATES_DIR, 'docker-compose.yml.template'), 'utf8');
    writeFileSync(join(process.cwd(), 'docker-compose.yml'), dockerTemplate);
    console.log('✔ Created docker-compose.yml');
  }

  // 5. Update package.json (if exists)
  const packageJsonPath = join(process.cwd(), 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }
      packageJson.scripts['croutons:test'] = 'node examples/send-facts.js';
      // Ensure type: module is set for ESM
      if (!packageJson.type) {
        packageJson.type = 'module';
      }
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log('✔ Updated package.json with croutons:test script');
    } catch (e) {
      console.log('⚠ Could not update package.json:', e.message);
    }
  } else {
    // Create minimal package.json if it doesn't exist
    const minimalPackageJson = {
      name: 'my-croutons-satellite',
      version: '1.0.0',
      type: 'module',
      scripts: {
        'croutons:test': 'node examples/send-facts.js'
      }
    };
    writeFileSync(packageJsonPath, JSON.stringify(minimalPackageJson, null, 2) + '\n');
    console.log('✔ Created package.json');
  }

  // Success message
  console.log('\n✅ Setup complete!\n');
  console.log('Next steps:');
  console.log('  1. Set your API key as an environment variable:');
  console.log('     export CROUTONS_API_KEY="grph_xxx"');
  console.log('  2. Test the integration:');
  console.log('     npm run croutons:test');
  if (answers.includeDocker) {
    console.log('  3. (Optional) Start local Kafka for testing:');
    console.log('     docker compose up -d');
  }
  console.log('');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

