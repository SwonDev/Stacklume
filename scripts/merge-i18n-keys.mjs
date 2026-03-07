/**
 * Merge agent-generated i18n key files into the main es.json and en.json
 * Usage: node scripts/merge-i18n-keys.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const I18N_DIR = './src/lib/i18n';
const SCRIPTS_DIR = './scripts';

// Read main translation files
const esPath = join(I18N_DIR, 'es.json');
const enPath = join(I18N_DIR, 'en.json');
const es = JSON.parse(readFileSync(esPath, 'utf8'));
const en = JSON.parse(readFileSync(enPath, 'utf8'));

console.log(`Starting: ES=${Object.keys(es).length} keys, EN=${Object.keys(en).length} keys`);

// Find all agent key files
const keyFiles = readdirSync(SCRIPTS_DIR)
  .filter(f => f.startsWith('i18n-keys-') && f.endsWith('.json'));

console.log(`Found ${keyFiles.length} agent key files: ${keyFiles.join(', ')}`);

let totalAdded = 0;
let totalSkipped = 0;

for (const file of keyFiles) {
  const filePath = join(SCRIPTS_DIR, file);
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    const agentEs = data.es || {};
    const agentEn = data.en || {};
    let added = 0;
    let skipped = 0;

    // Add ES keys
    for (const [key, value] of Object.entries(agentEs)) {
      if (!(key in es)) {
        es[key] = value;
        added++;
      } else {
        skipped++;
      }
    }

    // Add EN keys
    for (const [key, value] of Object.entries(agentEn)) {
      if (!(key in en)) {
        en[key] = value;
      }
    }

    // Also add any ES keys missing in EN with a placeholder
    for (const key of Object.keys(agentEs)) {
      if (!(key in en)) {
        // Try to use the EN value from the agent, or fallback to ES
        en[key] = agentEn[key] || agentEs[key];
      }
    }

    // And vice versa
    for (const key of Object.keys(agentEn)) {
      if (!(key in es)) {
        es[key] = agentEs[key] || agentEn[key];
      }
    }

    console.log(`  ${file}: +${added} new, ${skipped} already existed`);
    totalAdded += added;
    totalSkipped += skipped;
  } catch (err) {
    console.error(`  ERROR reading ${file}:`, err.message);
  }
}

// Sort keys alphabetically for consistency
const sortedEs = Object.fromEntries(Object.entries(es).sort(([a], [b]) => a.localeCompare(b)));
const sortedEn = Object.fromEntries(Object.entries(en).sort(([a], [b]) => a.localeCompare(b)));

// Write back
writeFileSync(esPath, JSON.stringify(sortedEs, null, 2) + '\n', 'utf8');
writeFileSync(enPath, JSON.stringify(sortedEn, null, 2) + '\n', 'utf8');

console.log(`\nDone! Added ${totalAdded} new keys, ${totalSkipped} already existed`);
console.log(`Final: ES=${Object.keys(sortedEs).length} keys, EN=${Object.keys(sortedEn).length} keys`);

// Check for mismatches
const missingInEn = Object.keys(sortedEs).filter(k => !(k in sortedEn));
const missingInEs = Object.keys(sortedEn).filter(k => !(k in sortedEs));
if (missingInEn.length > 0) console.log(`WARNING: ${missingInEn.length} keys missing in EN`);
if (missingInEs.length > 0) console.log(`WARNING: ${missingInEs.length} keys missing in ES`);
