/**
 * Epic Foundation CRM — Database Schema Runner
 * Uses the Supabase Management API to run raw SQL (CREATE TABLE, etc.)
 * Requires your Supabase personal access token from:
 *   https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/run-schema.js staging
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/run-schema.js production
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const ENV    = process.argv[2] || 'staging';
const token  = process.env.SUPABASE_ACCESS_TOKEN;

// Keys are loaded from environment variables (NOT hardcoded here).
// Set them in your .env file or shell before running this script.
// The .env file is loaded automatically via dotenv.
require('dotenv').config();

const ENV_CONFIGS = {
  staging: {
    url:        process.env.SUPABASE_STAGING_URL        || process.env.SUPABASE_URL,
    projectRef: (process.env.SUPABASE_STAGING_URL       || process.env.SUPABASE_URL || '').replace('https://', '').replace('.supabase.co', ''),
    serviceKey: process.env.SUPABASE_STAGING_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY,
  },
  production: {
    url:        process.env.SUPABASE_PROD_URL        || process.env.SUPABASE_URL,
    projectRef: (process.env.SUPABASE_PROD_URL       || process.env.SUPABASE_URL || '').replace('https://', '').replace('.supabase.co', ''),
    serviceKey: process.env.SUPABASE_PROD_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY,
  },
};
const CONFIGS = ENV_CONFIGS;

const cfg = CONFIGS[ENV];
if (!cfg) { console.error('Unknown env'); process.exit(1); }

async function runSQLViaManagementAPI(sql) {
  if (!token) throw new Error('Missing SUPABASE_ACCESS_TOKEN env var');
  const res = await fetch(`https://api.supabase.com/v1/projects/${cfg.projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

function hashPassword(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

async function main() {
  const sb = createClient(cfg.url, cfg.serviceKey);

  console.log(`\n🚀 Setting up ${ENV} database via Management API`);
  console.log(`   Project: ${cfg.projectRef}\n`);

  // ── Run Schema ─────────────────────────────────────────────
  if (token) {
    console.log('📋 Running schema.sql via Management API…');
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    try {
      await runSQLViaManagementAPI(schema);
      console.log('   ✅ Schema applied successfully!');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('   ℹ️  Tables already exist — schema skipped (idempotent).');
      } else {
        console.log('   ⚠️  Schema error (non-fatal):', err.message.slice(0, 300));
      }
    }
  } else {
    console.log('⚠️  SUPABASE_ACCESS_TOKEN not set — skipping DDL schema. Tables must be created manually.');
    console.log('   Get your token at: https://supabase.com/dashboard/account/tokens');
  }

  // ── Seed Admin ─────────────────────────────────────────────
  console.log('\n👤 Seeding admin user…');
  const { data: existing } = await sb.from('admins').select('id').eq('email', 'hunter@epicfoundation.com').maybeSingle();
  if (existing) {
    console.log(`   Admin already exists (${ENV}).`);
  } else {
    const hash      = hashPassword('EpicCRM2024!');
    const ts        = new Date().toISOString();
    const actLog    = JSON.stringify([{ type: 'created', text: 'Admin account created', actor: 'System', timestamp: ts }]);
    const { error } = await sb.from('admins').insert({
      id: ENV === 'production' ? 'ADMIN0001' : 'ADMIN0001',
      name: 'Hunter Burnside', email: 'hunter@epicfoundation.com',
      role: 'Super Admin', status: 'Active', password_hash: hash,
      created_at: ts, updated_at: ts, created_by: 'System', updated_by: 'System',
      activity_log: actLog,
    });
    if (error) {
      console.error(`   ❌ Seed failed: ${error.message}`);
    } else {
      console.log(`   ✅ Admin created — hunter@epicfoundation.com / EpicCRM2024!`);
      console.log(`   ⚠️  Reset this password after first login!`);
    }
  }

  // ── Verify Core Tables ─────────────────────────────────────
  console.log('\n🔍 Verifying core tables…');
  const core = ['users', 'auctions', 'tasks', 'financials', 'admins', 'messages'];
  for (const t of core) {
    const { data, error } = await sb.from(t).select('*').limit(1);
    if (error) {
      if (error.code === '42P01') {
        console.log(`   ❌ ${t}: table does not exist — run schema.sql in the Supabase SQL Editor`);
      } else {
        console.log(`   ❌ ${t}: ${error.message}`);
      }
    } else {
      console.log(`   ✅ ${t}: accessible (${data.length} row${data.length !== 1 ? 's' : ''} returned)`);
    }
  }
  console.log(`\n✅ ${ENV} setup complete!\n`);
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
