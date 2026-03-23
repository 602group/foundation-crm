/**
 * Run schema.sql on both Supabase projects using the Management API.
 * The Supabase Management API /v1/projects/:ref/database/query endpoint
 * accepts arbitrary SQL and runs it with full privileges.
 *
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/run-schema-all.js
 * Get token: https://supabase.com/dashboard/account/tokens
 */
'use strict';

const fs    = require('fs');
const path  = require('path');

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const PROJECTS = [
  { name: 'staging',    ref: 'igpzzzsukynsgzqtqprl' },
  { name: 'production', ref: 'fmvrbvlcmuuhjomylpto' },
];

async function runSQL(projectRef, sql) {
  const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(typeof data === 'string' ? data : JSON.stringify(data).slice(0, 300));
  return data;
}

async function main() {
  if (!ACCESS_TOKEN) {
    console.error('\n❌ SUPABASE_ACCESS_TOKEN is not set.');
    console.error('   Get your personal access token from:');
    console.error('   https://supabase.com/dashboard/account/tokens\n');
    console.error('   Then run:');
    console.error('   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/run-schema-all.js\n');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schema     = fs.readFileSync(schemaPath, 'utf8');
  console.log(`\n✅ Schema loaded: ${schema.length} bytes`);

  for (const { name, ref } of PROJECTS) {
    console.log(`\n📋 Applying schema to ${name} (${ref})…`);
    try {
      await runSQL(ref, schema);
      console.log(`   ✅ ${name}: Schema applied successfully!`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`   ℹ️  ${name}: Tables already exist (idempotent run — OK)`);
      } else {
        console.log(`   ⚠️  ${name}: ${err.message.slice(0, 400)}`);
      }
    }
  }
  console.log('\n✅ Done!\n');
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
