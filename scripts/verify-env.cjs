#!/usr/bin/env node

const mode = (process.argv[2] || 'ci').trim().toLowerCase();

const checksByMode = {
  ci: {
    required: [],
    optional: [
      'NEXT_PUBLIC_SITE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'POSTGRES_PRISMA_URL',
      'POSTGRES_URL_NON_POOLING',
      'DATABASE_URL',
      'CRON_SECRET',
      'RESEND_API_KEY',
    ],
    notes: [
      'CI mode allows placeholder Prisma envs and does not require live Supabase or Vercel secrets.',
    ],
  },
  preview: {
    required: [
      'PREVIEW_URL',
      'NEXT_PUBLIC_SITE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ],
    anyOf: [['POSTGRES_PRISMA_URL', 'DATABASE_URL']],
    optional: ['SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET', 'RESEND_API_KEY'],
    notes: [
      'Preview mode assumes a real Vercel preview deployment and preview-safe Supabase project or branch credentials.',
    ],
  },
  production: {
    required: [
      'NEXT_PUBLIC_SITE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'POSTGRES_PRISMA_URL',
      'POSTGRES_URL_NON_POOLING',
      'CRON_SECRET',
      'RESEND_API_KEY',
    ],
    optional: ['SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN'],
    notes: [
      'Production mode expects the full Vercel + Supabase contract to be present.',
    ],
  },
};

if (!checksByMode[mode]) {
  console.error(`Unknown mode "${mode}". Use one of: ${Object.keys(checksByMode).join(', ')}`);
  process.exit(1);
}

const config = checksByMode[mode];
const missing = [];

for (const key of config.required || []) {
  if (!String(process.env[key] || '').trim()) {
    missing.push(key);
  }
}

for (const group of config.anyOf || []) {
  const hasOne = group.some((key) => String(process.env[key] || '').trim());
  if (!hasOne) {
    missing.push(`one of: ${group.join(', ')}`);
  }
}

const optionalMissing = (config.optional || []).filter((key) => !String(process.env[key] || '').trim());

console.log(`Environment contract: ${mode}`);
for (const note of config.notes || []) {
  console.log(`- ${note}`);
}

if (missing.length > 0) {
  console.error('Missing required environment variables:');
  for (const entry of missing) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}

console.log('Required environment variables present.');

if (optionalMissing.length > 0) {
  console.log('Optional variables currently missing:');
  for (const key of optionalMissing) {
    console.log(`- ${key}`);
  }
}
