import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('Digital Literacy provider and completion truth', () => {
  it('shows attribution, license, fallback status, and local completion boundaries in the member module', () => {
    const source = read('app/(portal)/dashboard/learning/modules/[courseSlug]/page.tsx');
    assert.match(source, /Provider and license/);
    assert.match(source, /course\.provider\.license\.url/);
    assert.match(source, /provider terms/);
    assert.match(source, /does not copy, host, adapt, or imply endorsement/);
    assert.match(source, /WorkforceApLessonCtas/);
    assert.match(source, /appearance=\{hasLessons \? 'secondary' : 'primary'\}/);
    assert.match(source, /Mark module complete in WorkforceAP/);
    const lessonCtas = read('components/portal/WorkforceApLessonCtas.tsx');
    assert.match(lessonCtas, /Start this lesson/);
    assert.match(lessonCtas, /wa-kit-cta--lg/);
    assert.match(lessonCtas, /verificationLabel/);
    assert.match(lessonCtas, /fallbackUrl/);
    assert.match(source, /does not verify DigitalLearn activity or issue a DigitalLearn certificate/);
    assert.match(source, /\/dashboard\/certifications/);
  });

  it('shows the same attribution and provider-progress boundary on the public program page', () => {
    const source = read('marketing/src/pages/programs/[slug].astro');
    assert.match(source, /Course provider and license/);
    assert.match(source, /linkedContentProvider\.license\.url/);
    assert.match(source, /Provider-side progress and certificates are not synced or promised/);
  });

  it('does not retain the previously unsupported printable-certificate promise', () => {
    for (const path of [
      'shared/digitalLiteracyPathway.ts',
      'lib/content/programEnrollmentSteps.ts',
      'app/(portal)/dashboard/learning/modules/[courseSlug]/page.tsx',
    ]) {
      assert.doesNotMatch(read(path), /printable certificate|lets you print a certificate/i, path);
    }
  });
});
