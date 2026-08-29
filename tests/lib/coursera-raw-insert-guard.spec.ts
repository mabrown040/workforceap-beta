import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('bulk Coursera raw insert tenant guards', () => {
  it('validates linked users inside both course and badge INSERT sources', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'lib/coursera/csvImport.server.ts'),
      'utf8',
    );

    expect(source.match(/FROM \(VALUES \$\{Prisma\.join\(tuples, ', '\)\}\)/g)).toHaveLength(2);
    expect(source.match(/FROM users incoming_insert_user/g)).toHaveLength(2);
    expect(
      source.match(/incoming_insert_user\.organization_id = incoming\.organization_id/g),
    ).toHaveLength(2);
    expect(source.match(/incoming_insert_user\.deleted_at IS NULL/g)).toHaveLength(2);
  });

  it('adopts legacy course and badge rows under the same global email lock as admin mapping', () => {
    const importSource = readFileSync(
      resolve(process.cwd(), 'lib/coursera/csvImport.server.ts'),
      'utf8',
    );
    const adoptionSource = readFileSync(
      resolve(process.cwd(), 'lib/coursera/legacyRawProgressAdoption.server.ts'),
      'utf8',
    );

    expect(importSource).toContain('await adoptLegacyRawCourseProgressRows(tx, {');
    expect(importSource).toContain('await adoptLegacyRawBadgeProgressRows(tx, {');
    expect(importSource.match(/return prisma\.\$transaction\(async \(tx\) =>/g)).toHaveLength(2);
    expect(importSource).toContain('await lockLegacyRawCourseraEmails(db, [email]);');
    expect(importSource).toContain('await lockLegacyRawCourseraEmails(db, [lower]);');

    expect(adoptionSource).toContain('coursera:raw-email:${email}');
    expect(adoptionSource).toContain('UPDATE coursera_course_progress existing');
    expect(adoptionSource).toContain('UPDATE coursera_badge_progress existing');
    expect(adoptionSource.match(/existing\.organization_id IS NULL/g)).toHaveLength(2);
    expect(adoptionSource.match(/existing\.organization_id <>/g)).toHaveLength(4);
    expect(adoptionSource.match(/incoming_user\.deleted_at IS NULL/g)).toHaveLength(2);
    expect(adoptionSource.match(/existing_user\.deleted_at IS NULL/g)).toHaveLength(2);
  });

  it('keeps the monotonic tenant upserts after legacy adoption', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'lib/coursera/csvImport.server.ts'),
      'utf8',
    );

    expect(source).toContain(
      'overall_progress = GREATEST(coursera_course_progress.overall_progress, EXCLUDED.overall_progress)',
    );
    expect(source).toContain(
      'is_completed = (coursera_course_progress.is_completed OR EXCLUDED.is_completed)',
    );
    expect(source).toContain(
      'progress_percent = GREATEST(coursera_badge_progress.progress_percent, EXCLUDED.progress_percent)',
    );
    expect(source).toContain(
      'badge_completed = (coursera_badge_progress.badge_completed OR EXCLUDED.badge_completed)',
    );
  });
});
