#!/usr/bin/env node
/**
 * Validate cloud-agent testing prerequisites.
 * Exit 0 = static gates always OK; prints what's missing for runtime/E2E.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_FOR_DEV_SERVER = [
  'POSTGRES_PRISMA_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const RECOMMENDED_FOR_E2E = [
  'PLAYWRIGHT_BASE_URL',
  'E2E_MEMBER_EMAIL',
  'E2E_MEMBER_PASSWORD',
];

function fromEnvFile(fileName, key) {
  const filePath = path.join(ROOT, fileName);
  if (!existsSync(filePath)) return process.env[key];
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    if (m[1].trim() === key) {
      return m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return process.env[key];
}

function resolve(key) {
  return fromEnvFile('.env.local', key) ?? fromEnvFile('.env.e2e.local', key) ?? process.env[key];
}

function status(key, required) {
  const value = resolve(key);
  const ok = Boolean(value && String(value).trim());
  return { key, ok, required, hint: ok ? 'ok' : 'missing' };
}

const checks = [
  ...REQUIRED_FOR_DEV_SERVER.map((k) => status(k, true)),
  ...RECOMMENDED_FOR_E2E.map((k) => status(k, false)),
];

let exitCode = 0;
console.log('Cloud agent environment check\n');

for (const c of checks) {
  const mark = c.ok ? '✓' : c.required ? '✗' : '○';
  console.log(`  ${mark} ${c.key}${c.required ? ' (required for npm run dev)' : ' (recommended for E2E)'}`);
  if (!c.ok && c.required) exitCode = 1;
}

console.log('');
if (exitCode === 0) {
  console.log('Runtime env looks sufficient for local dev.');
} else {
  console.log('Missing required secrets. Options:');
  console.log('  1. Add dev Supabase URLs/keys to cloud-agent secrets → npm run agent:bootstrap');
  console.log('  2. Use Supabase MCP (project jqddnyuszufndwwezdwp) for schema/SQL checks');
  console.log('  3. Run Playwright with PLAYWRIGHT_BASE_URL=<Vercel preview URL> (no local DB)');
  console.log('Static gates (typecheck, test:unit, build) work without these.');
}

process.exit(exitCode);
