import * as fs from 'fs';
const envLocal = fs.readFileSync('.env.local', 'utf-8');
const lines = envLocal.split('\n');
const fixedLines = lines.map(line => {
  if (line.startsWith('POSTGRES_PRISMA_URL=')) {
    return 'POSTGRES_PRISMA_URL="postgres://postgres.jqddnyuszufndwwezdwp:mabrown040@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"';
  }
  return line;
});
fs.writeFileSync('.env.local', fixedLines.join('\n'));
