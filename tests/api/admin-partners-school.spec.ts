import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('admin partners school manageability', () => {
  const post = readFileSync(path.resolve(__dirname, '../../app/api/admin/partners/route.ts'), 'utf-8');
  const patch = readFileSync(
    path.resolve(__dirname, '../../app/api/admin/partners/[id]/route.ts'),
    'utf-8',
  );
  const directory = readFileSync(
    path.resolve(__dirname, '../../components/portal/kit/pages/admin-subviews/PartnersDirectoryKit.tsx'),
    'utf-8',
  );
  const listPage = readFileSync(path.resolve(__dirname, '../../app/admin/partners/page.tsx'), 'utf-8');
  const detail = readFileSync(path.resolve(__dirname, '../../app/admin/partners/[id]/page.tsx'), 'utf-8');
  const table = readFileSync(
    path.resolve(__dirname, '../../components/admin/PartnersTableClient.tsx'),
    'utf-8',
  );

  it('creates admin partners as active with a validated catalog', () => {
    expect(post).toContain("status: 'active'");
    expect(post).toContain('validateAdminProgramSlugs');
    expect(post).toContain('sponsorshipStampFields');
  });

  it('rejects publishing without programs on PATCH', () => {
    expect(patch).toContain('validateAdminProgramSlugs');
    expect(patch).toContain('Pick at least one program before publishing the enrollment page');
  });

  it('shows school partners on the directory cards', () => {
    expect(directory).toContain('partnerDirectoryMeta');
    expect(directory).toContain('School');
    expect(listPage).toContain('enrollmentPageEnabled');
    expect(listPage).toContain('partnerType');
    expect(listPage).toContain("enrollmentPageEnabled: 'desc'");
    expect(listPage).toContain("export const dynamic = 'force-dynamic'");
    expect(listPage).toContain('const PARTNER_LIMIT = 500');
  });

  it('exposes school config and funnel on the partner detail page', () => {
    expect(detail).toContain('PartnerSchoolConfigCard');
    expect(detail).toContain('isSchoolManagedPartner');
    expect(detail).toContain('PartnerEnrollmentFunnelStrip');
  });

  it('passes the program catalog into legacy table edit', () => {
    expect(table).toContain('programs={programs}');
    expect(listPage).toContain('programs={PROGRAMS.map');
  });
});
