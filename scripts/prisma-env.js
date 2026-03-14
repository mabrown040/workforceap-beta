#!/usr/bin/env node
// Ensures POSTGRES_* env vars exist for Prisma (Vercel/Supabase integration uses these)
// Falls back to DATABASE_URL for local dev
// Usage: node scripts/prisma-env.js <command> [args...]
// Or: node -r ./scripts/prisma-env.js -e "require('child_process').spawnSync('prisma',['generate'],{stdio:'inherit',env:process.env})"

const fs = require('fs');
const path = require('path');

// Load .env if present (for local dev)
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    });
  }
} catch (_) {}

if (!process.env.POSTGRES_PRISMA_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_PRISMA_URL = process.env.DATABASE_URL;
}
if (!process.env.POSTGRES_URL_NON_POOLING && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL_NON_POOLING = process.env.DATABASE_URL;
}

// If invoked with args, run the command with our env (for postinstall/build)
const [cmd, ...args] = process.argv.slice(2);
if (cmd) {
  const { spawnSync } = require('child_process');
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
  process.exit(r.status ?? 1);
}
