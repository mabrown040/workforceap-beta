const DEMO_REF = 'esbdrgaonplpvzmtrdhw';
const PROD_REF = 'jqddnyuszufndwwezdwp';

const REFS = {
  demo: DEMO_REF,
  prod: PROD_REF,
};

function parseUrl(value) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function projectForUrl(value, kind = 'database') {
  if (!value) return 'unset';
  const parsed = parseUrl(value);
  if (!parsed) return 'unknown';

  const hostname = parsed.hostname.toLowerCase();
  const username = decodeURIComponent(parsed.username || '').toLowerCase();
  const isSupabasePooler =
    hostname === 'pooler.supabase.com' || hostname.endsWith('.pooler.supabase.com');
  const rawPoolerOptions = parsed.searchParams.getAll('options');
  const optionReferences = rawPoolerOptions.flatMap((value) =>
    new URLSearchParams(value).getAll('reference')
  );

  for (const [project, ref] of Object.entries(REFS)) {
    const exactPublicHost = hostname === `${ref}.supabase.co`;
    const exactDatabaseHost = hostname === `db.${ref}.supabase.co`;
    // Supavisor resolves options.reference before the legacy dotted username.
    // Only trust the dotted form when no reference marker is present anywhere.
    const exactPoolerUser =
      isSupabasePooler && username === `postgres.${ref}` && optionReferences.length === 0;
    // Vercel's current Supabase integration can keep the shared-pooler user as
    // `postgres` and route the tenant through `options=reference=<project-ref>`.
    // Require the real Supabase pooler host, the exact role, and exactly one
    // reference marker so an unrelated URL cannot merely mention an allowlisted
    // ref and pass this guard.
    const exactPoolerOptionReference =
      isSupabasePooler &&
      username === 'postgres' &&
      rawPoolerOptions.length === 1 &&
      optionReferences.length === 1 &&
      optionReferences[0] === ref;

    if (
      (kind === 'public' && exactPublicHost) ||
      (kind === 'database' &&
        (exactDatabaseHost || exactPoolerUser || exactPoolerOptionReference))
    ) {
      return project;
    }
  }

  return 'unknown';
}

function expectedProjectForVercelEnv(vercelEnv) {
  if (vercelEnv === 'production') return 'prod';
  if (vercelEnv === 'preview' || vercelEnv === 'development') return 'demo';
  return null;
}

function inspectSupabaseEnvironment(env = process.env, options = {}) {
  const { requireVercel = false, requireDirectUrl = false } = options;
  const errors = [];
  const vercelEnv = env.VERCEL_ENV || '';
  const expected = expectedProjectForVercelEnv(vercelEnv);
  const isVercel = env.VERCEL === '1';

  if (requireVercel && !isVercel) {
    errors.push('This database operation is allowed only during a Vercel deployment.');
  }
  if (!expected) {
    errors.push('VERCEL_ENV must be exactly production, preview, or development.');
  }

  const urls = {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL || '',
    POSTGRES_PRISMA_URL: env.POSTGRES_PRISMA_URL || '',
    POSTGRES_URL_NON_POOLING: env.POSTGRES_URL_NON_POOLING || '',
    DATABASE_URL: env.DATABASE_URL || '',
  };

  const classifications = {
    NEXT_PUBLIC_SUPABASE_URL: projectForUrl(urls.NEXT_PUBLIC_SUPABASE_URL, 'public'),
    POSTGRES_PRISMA_URL: projectForUrl(urls.POSTGRES_PRISMA_URL),
    POSTGRES_URL_NON_POOLING: projectForUrl(urls.POSTGRES_URL_NON_POOLING),
    DATABASE_URL: projectForUrl(urls.DATABASE_URL),
  };

  const requiredNames = ['NEXT_PUBLIC_SUPABASE_URL', 'POSTGRES_PRISMA_URL'];
  if (requireDirectUrl) requiredNames.push('POSTGRES_URL_NON_POOLING');

  for (const name of requiredNames) {
    const classification = classifications[name];
    if (classification === 'unset') {
      errors.push(`${name} is required on Vercel.`);
    } else if (classification === 'unknown') {
      errors.push(`${name} does not identify an approved Supabase project.`);
    } else if (expected && classification !== expected) {
      errors.push(`${name} points at the wrong Supabase project for VERCEL_ENV=${vercelEnv}.`);
    }
  }

  for (const name of ['POSTGRES_URL_NON_POOLING']) {
    const classification = classifications[name];
    if (classification !== 'unset' && classification !== 'unknown' && expected && classification !== expected) {
      errors.push(`${name} points at the wrong Supabase project for VERCEL_ENV=${vercelEnv}.`);
    }
    if (urls[name] && classification === 'unknown') {
      errors.push(`${name} is set but does not identify an approved Supabase project.`);
    }
  }

  // DATABASE_URL is a fallback only. Vercel may inject an unrelated value,
  // but Prisma and runtime signup checks prefer the explicit POSTGRES_* URLs.
  // Validate it only when either effective Prisma URL would need the fallback.
  if (!urls.POSTGRES_PRISMA_URL || (requireDirectUrl && !urls.POSTGRES_URL_NON_POOLING)) {
    const classification = classifications.DATABASE_URL;
    if (classification !== 'unset' && classification !== 'unknown' && expected && classification !== expected) {
      errors.push(`DATABASE_URL points at the wrong Supabase project for VERCEL_ENV=${vercelEnv}.`);
    }
    if (urls.DATABASE_URL && classification === 'unknown') {
      errors.push('DATABASE_URL is set but does not identify an approved Supabase project.');
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    isVercel,
    vercelEnv,
    expected,
    classifications,
    directDatabaseUrl:
      urls.POSTGRES_URL_NON_POOLING || urls.POSTGRES_PRISMA_URL || urls.DATABASE_URL || '',
  };
}

function assertSupabaseEnvironment(env = process.env, options = {}) {
  const result = inspectSupabaseEnvironment(env, options);
  if (!result.ok) {
    const error = new Error(result.errors.join('\n'));
    error.code = 'SUPABASE_PROJECT_GUARD';
    error.details = result;
    throw error;
  }
  return result;
}

module.exports = {
  DEMO_REF,
  PROD_REF,
  assertSupabaseEnvironment,
  expectedProjectForVercelEnv,
  inspectSupabaseEnvironment,
  projectForUrl,
};
