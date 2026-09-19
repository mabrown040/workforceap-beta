import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Messages = Record<string, unknown>;

function loadJson(relPath: string): Messages {
  return JSON.parse(readFileSync(path.join(process.cwd(), relPath), 'utf8')) as Messages;
}

function at(obj: Messages, dotted: string): string {
  let cur: unknown = obj;
  for (const part of dotted.split('.')) {
    assert.equal(typeof cur, 'object');
    assert.notEqual(cur, null);
    cur = (cur as Messages)[part];
  }
  assert.equal(typeof cur, 'string', dotted);
  return cur as string;
}

const CATALOGUES = ['messages/es.json', 'marketing/src/i18n/es.json'] as const;

const CTA_PARITY: Array<{ key: string; expected: string }> = [
  { key: 'marketing.home.heroCta', expected: 'Solicita ahora' },
  { key: 'marketing.home.heroCtaPrimary', expected: 'Solicita ahora' },
  { key: 'marketing.home.heroMobilePrimaryCta', expected: 'Solicita ahora' },
  { key: 'marketing.programs.quickStartCard1Cta', expected: 'Empieza aquí' },
  { key: 'marketing.programs.howToChooseFactor2Label', expected: 'Acceso a un dispositivo' },
  { key: 'marketing.programs.howToChooseFactor5Label', expected: 'Ruta de crecimiento' },
  { key: 'marketing.impact.stat4Label', expected: 'Costo para miembros — sin costo' },
  { key: 'apply.mobileTrustBarNoCost', expected: 'Sin costo para miembros' },
  { key: 'auth.login.noCostMembers', expected: 'Sin costo para miembros' },
];

for (const catalogue of CATALOGUES) {
  const messages = loadJson(catalogue);

  test(`${catalogue}: Spanish marketing/apply CTAs match the English promise`, () => {
    for (const { key, expected } of CTA_PARITY) {
      assert.equal(at(messages, key), expected, key);
    }
  });

  test(`${catalogue}: no-cost trust cues stay short enough to wrap on a 390px phone`, () => {
    assert.ok(at(messages, 'apply.mobileTrustBarNoCost').length <= 28);
    assert.ok(at(messages, 'auth.login.noCostMembers').length <= 28);
    assert.match(at(messages, 'apply.mobileTrustBar'), /^✓ Sin costo para miembros ·/);
  });
}

test('messages/es.json: school confirmation keys are translated, not English fallback', () => {
  const es = loadJson('messages/es.json');
  const en = loadJson('messages/en.json');
  const keys = [
    'apply.confirmationSchoolMetaDescription',
    'apply.confirmationSchoolHeroLead',
    'apply.confirmationSchoolHeroBody',
    'apply.confirmationSchoolParentAckNote',
    'apply.confirmationSchoolChipReview',
    'apply.confirmationSchoolStep1Title',
    'apply.confirmationSchoolStep1Desc',
    'apply.confirmationSchoolStep2Title',
    'apply.confirmationSchoolStep2Desc',
    'apply.confirmationSchoolStep3Title',
    'apply.confirmationSchoolStep3Desc',
    'apply.confirmationSchoolStep4Title',
    'apply.confirmationSchoolStep4Desc',
  ];
  for (const key of keys) {
    const value = at(es, key);
    assert.notEqual(value, at(en, key), key);
    assert.notEqual(value.trim(), '', key);
  }
});

test('messages/es.json: counselor, about, and employer UI copy is not leftover English', () => {
  const es = loadJson('messages/es.json');
  const en = loadJson('messages/en.json');
  const keys = [
    'counselor.placementTrackingTitle',
    'counselor.triageQueueTitle',
    'counselor.walkInSessionTitle',
    'counselor.notificationCenter',
    'marketing.about.title',
    'marketing.about.heading',
    'marketing.about.subheading',
    'marketing.about.description',
    'employer.employerMessagesSubtitleMobile',
    'employer.employerMessagesSubtitleDesktop',
    // Counselor placement form / triage / session page metadata (WAP-152 leftovers).
    'counselor.cancel',
    'counselor.memberId',
    'counselor.employer',
    'counselor.jobTitle',
    'counselor.startDate',
    'counselor.program',
    'counselor.notes',
    'counselor.recording',
    'counselor.salary',
    'counselor.placed',
    'counselor.failed',
    'counselor.triage',
    'counselor.inOfficeSessionsMetaTitle',
    'counselor.inOfficeSessionsMetaDesc',
    'counselor.sessionRunMetaTitle',
    'counselor.sessionRunMetaDesc',
    'counselor.walkInSessionMetaTitle',
    'counselor.walkInSessionMetaDesc',
  ];
  for (const key of keys) {
    assert.notEqual(at(es, key), at(en, key), key);
  }
});

test('messages/es.json: admin analytics and employer LOI/outcomes keys exist and are translated', () => {
  const es = loadJson('messages/es.json');
  const en = loadJson('messages/en.json');
  const keys = [
    'admin.memberCount',
    'admin.analyticsPageTitle',
    'admin.analyticsPageDescription',
    'employer.loiTitle',
    'employer.loiDescription',
    'employer.outcomes.title',
    'employer.outcomes.description',
  ];
  for (const key of keys) {
    const value = at(es, key);
    assert.notEqual(value, at(en, key), key);
    assert.notEqual(value.trim(), '', key);
  }
  // ICU plural arms must survive translation.
  assert.match(at(es, 'admin.memberCount'), /^\{count, plural, one \{[^}]+\} other \{[^}]+\}\}$/);
});
