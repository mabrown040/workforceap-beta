import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const seed = readFileSync(join(process.cwd(), 'prisma/seed-demo.ts'), 'utf8');

describe('demo seed writes dashboard-readable progress', () => {
  it('plans live progress and writes enrollment, course progress, points, and certs', () => {
    expect(seed).toMatch(/planDemoMemberProgress/);
    expect(seed).toMatch(/prisma\.courseEnrollment\.upsert/);
    expect(seed).toMatch(/prisma\.courseProgress\.create/);
    expect(seed).toMatch(/prisma\.memberProgramProgress\.upsert/);
    expect(seed).toMatch(/prisma\.memberPoints\.upsert/);
    expect(seed).toMatch(/prisma\.pointsTransaction\.upsert/);
    expect(seed).toMatch(/prisma\.userCertification\.upsert/);
    expect(seed).toMatch(/seedMemberLiveProgress/);
  });
});
