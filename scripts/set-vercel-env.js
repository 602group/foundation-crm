/**
 * Sets all required environment variables on the Vercel project
 * via the Vercel REST API (avoids shell escaping issues with special chars).
 *
 * Run: node scripts/set-vercel-env.js
 * Requires: VERCEL_TOKEN env var (get from https://vercel.com/account/tokens)
 */
'use strict';

// ── Pull the Vercel auth token from the CLI auth file ──────────────────
const os   = require('os');
const fs   = require('fs');
const path = require('path');

// Vercel CLI stores auth token in ~/.local/share/com.vercel.cli/auth.json
// or ~/.vercel/auth.json depending on OS/version
function getVercelToken() {
  const candidates = [
    path.join(os.homedir(), '.local', 'share', 'com.vercel.cli', 'auth.json'),
    path.join(os.homedir(), '.vercel', 'auth.json'),
    path.join(os.homedir(), 'Library', 'Application Support', 'com.vercel.cli', 'auth.json'),
  ];
  for (const p of candidates) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (data.token) return data.token;
    } catch {}
  }
  return process.env.VERCEL_TOKEN || null;
}

const VERCEL_TOKEN  = getVercelToken();
const PROJECT_ID    = 'prj_ES3Vt1mNRxbxXU64yFgD0ak38dNj';
const TEAM_ID       = 'team_YAsBjAYnkodfbcuxPamCElpi';

if (!VERCEL_TOKEN) {
  console.error('Could not find Vercel token. Run `vercel login` first.');
  process.exit(1);
}

// ── Environment variable definitions ────────────────────────────────────
// Load from environment — set these in your shell before running, or in .env
require('dotenv').config();

const OPENAI_KEY     = process.env.OPENAI_API_KEY     || '';
const SESSION_SECRET = process.env.SESSION_SECRET      || '';
const STAGING_URL    = process.env.SUPABASE_STAGING_URL    || '';
const STAGING_KEY    = process.env.SUPABASE_STAGING_SERVICE_KEY || '';
const PRODUCTION_URL = process.env.SUPABASE_PROD_URL   || '';
const PRODUCTION_KEY = process.env.SUPABASE_PROD_SERVICE_KEY   || '';

// Format: { key, value, environments: ['production'|'preview'|'development'][] }
const ENV_VARS = [
  // OpenAI — all environments
  { key: 'OPENAI_API_KEY',       value: OPENAI_KEY,      environments: ['production', 'preview', 'development'] },
  // Session secret — all environments (same value — only changes meaning for prod security)
  { key: 'SESSION_SECRET',       value: SESSION_SECRET,  environments: ['production', 'preview', 'development'] },
  { key: 'NODE_ENV',             value: 'production',    environments: ['production', 'preview'] },
  // Staging keys → used on preview (all non-production branches get staging DB)
  { key: 'SUPABASE_URL',         value: STAGING_URL,     environments: ['preview', 'development'] },
  { key: 'SUPABASE_SERVICE_KEY', value: STAGING_KEY,     environments: ['preview', 'development'] },
  // Production keys → only go to production environment
  { key: 'SUPABASE_URL',         value: PRODUCTION_URL,  environments: ['production'] },
  { key: 'SUPABASE_SERVICE_KEY', value: PRODUCTION_KEY,  environments: ['production'] },
];

async function upsertEnvVar(key, value, environments) {
  const url = `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}&upsert=true`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key, value, type: 'encrypted', target: environments }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.error?.includes('already exists')) {
    throw new Error(data.error || JSON.stringify(data).slice(0, 200));
  }
  return data;
}

async function main() {
  console.log(`\n🔐 Setting Vercel environment variables for project ${PROJECT_ID}...\n`);

  for (const { key, value, environments } of ENV_VARS) {
    try {
      await upsertEnvVar(key, value, environments);
      console.log(`  ✅ ${key} → [${environments.join(', ')}]`);
    } catch (err) {
      console.log(`  ⚠️  ${key} → [${environments.join(', ')}]: ${err.message}`);
    }
  }

  console.log('\n✅ All environment variables set!\n');
  console.log('Next: run `vercel deploy` for staging, or push to GitHub for auto-deploy.\n');
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
