import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const source = (relativePath: string) => readFileSync(path.join(root, relativePath), 'utf8');

describe('production portal smoke regressions', () => {
  it('authorizes message thread mutations against the resolved portal context', () => {
    const employerRoute = source('app/api/employer/messages/route.ts');
    const partnerRoute = source('app/api/partner/messages/route.ts');

    expect(employerRoute).toContain('assertEmployerCanAccessThread(ctx.employerId, thread.id)');
    expect(employerRoute).not.toContain('assertEmployerUserCanAccessThread(user.id, thread.id)');
    expect(partnerRoute).toContain('assertPartnerCanAccessThread(ctx.partnerId, thread.id)');
    expect(partnerRoute).not.toContain('assertPartnerUserCanAccessThread(user.id, thread.id)');
  });

  it('disables Next.js prefetch for counselor links that cross into the public site', () => {
    const page = source('app/(portal)/counselor/resources/page.tsx');

    expect(page).toContain('<Link href={href} prefetch={false}');
  });

  it('audits canonical portal routes instead of redirect-only aliases', () => {
    const paths = source('scripts/lib/portal-audit-paths.mjs');

    expect(paths).not.toContain("'/dashboard/assessment',");
    expect(paths).not.toContain("'/partner/members',");
  });
});
