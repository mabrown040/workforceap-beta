#!/usr/bin/env node
/**
 * Validate cloud-agent Supabase wiring. Fails if real DB credentials are missing.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED = [
  'POSTGRES_PRISMA_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const E2E_RECOMMENDED = ['PLAYWRIGHT_BASE_URL', 'E2E_MEMBER_EMAIL', 'E2E_MEMBER_PASSWORD'];

function fromEnvFile(fileName, key) {
  const filePath = path.join(ROOT, fileName);
  if (!existsSync(filePath)) return process.env[key];
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m || m[1].trim() !== key) continue;
    return m[2].trim().replace(/^["']|["']$/g, '');
  }
  return process.env[key];
}

function resolve(key) {
  return fromEnvFile('.env.local', key) ?? fromEnvFile('.env.e2e.local', key) ?? process.env[key];
}

function isPlaceholderDb(url) {
  return !url || url.includes('127.0.0.1:5432/placeholder') || url.includes('placeholder:placeholder');
}

let exitCode = 0;
console.log(`Cloud agent Supabase check (WAP_AGENT_ENV=${process.env.WAP_AGENT_ENV ?? 'dev'})\n`);

for (const key of REQUIRED) {
  const value = resolve(key);
  const ok = Boolean(value?.trim()) && (key !== 'POSTGRES_PRISMA_URL' || !isPlaceholderDb(value));
  const mark = ok ? '✓' : '✗';
  console.log(`  ${mark} ${key}`);
  if (!ok) exitCode = 1;
}

console.log('');
for (const key of E2E_RECOMMENDED) {
  const ok = Boolean(resolve(key)?.trim());
  console.log(`  ${ok ? '✓' : '○'} ${key}${ok ? '' : ' (set for Vercel preview E2E)'}`);
}

console.log('');
if (exitCode) {
  console.error('Real Supabase required. Fix:');
  console.error('  1. Cloud-agent secrets: SUPABASE_DB_PASSWORD_DEV, SUPABASE_SERVICE_ROLE_KEY_DEV');
  console.error('  2. Supabase MCP → get_publishable_keys → export anon key');
  console.error('  3. npm run agent:bootstrap');
  process.exit(1);
}

console.log('Supabase env OK for local dev.');
console.log('DB checks via MCP: execute_sql on project_id from config/agent-supabase.json');
