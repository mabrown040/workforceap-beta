import assert from 'node:assert/strict';
import test from 'node:test';

import { EMPLOYER_ROLE_SAMPLES } from '@/lib/test-fixtures/employerRoleSamples';
import { rankProgramsForEmployerJob } from './rankProgramsForEmployerJob';

const supportVsTechnicalSlugs = [
  'it-support-professional-certificate-ibm',
  'comptia-a-professional-certificate',
  'software-developer-professional-certificate-ibm',
  'data-analytics-professional-certificate-google',
] as const;

test('customer success roles rank support tracks above developer and data tracks', () => {
  const ranked = rankProgramsForEmployerJob(
    EMPLOYER_ROLE_SAMPLES.customerSuccessManagerMidMarket,
    [...supportVsTechnicalSlugs]
  );

  const orderedSlugs = ranked.map((program) => program.slug);
  assert.deepEqual(orderedSlugs.slice(0, 2), [
    'it-support-professional-certificate-ibm',
    'comptia-a-professional-certificate',
  ]);
  assert.equal(orderedSlugs.at(-1), 'data-analytics-professional-certificate-google');
});

test('customer support roles are not pushed below developer and data tracks by short technical terms', () => {
  const ranked = rankProgramsForEmployerJob(
    EMPLOYER_ROLE_SAMPLES.customerSupportRepresentative,
    [...supportVsTechnicalSlugs]
  );

  const orderedSlugs = ranked.map((program) => program.slug);
  assert.deepEqual(orderedSlugs.slice(0, 2), [
    'it-support-professional-certificate-ibm',
    'comptia-a-professional-certificate',
  ]);
  assert.ok(
    orderedSlugs.indexOf('it-support-professional-certificate-ibm') <
      orderedSlugs.indexOf('software-developer-professional-certificate-ibm')
  );
  assert.ok(
    orderedSlugs.indexOf('it-support-professional-certificate-ibm') <
      orderedSlugs.indexOf('data-analytics-professional-certificate-google')
  );
});

test('software engineering roles still rank software developer track first', () => {
  const ranked = rankProgramsForEmployerJob(EMPLOYER_ROLE_SAMPLES.softwareEngineer, [
    'software-developer-professional-certificate-ibm',
    'ai-professional-developer-certificate-ibm',
    'it-support-professional-certificate-ibm',
    'data-analytics-professional-certificate-google',
  ]);

  const orderedSlugs = ranked.map((program) => program.slug);
  assert.equal(ranked[0]?.slug, 'software-developer-professional-certificate-ibm');
  assert.ok(
    orderedSlugs.indexOf('software-developer-professional-certificate-ibm') <
      orderedSlugs.indexOf('it-support-professional-certificate-ibm')
  );
  assert.ok(
    orderedSlugs.indexOf('software-developer-professional-certificate-ibm') <
      orderedSlugs.indexOf('data-analytics-professional-certificate-google')
  );
});

test('data analyst roles still rank data programs above support and developer tracks', () => {
  const ranked = rankProgramsForEmployerJob(EMPLOYER_ROLE_SAMPLES.dataAnalyst, [
    'data-analytics-professional-certificate-google',
    'data-science-professional-certificate-ibm',
    'software-developer-professional-certificate-ibm',
    'it-support-professional-certificate-ibm',
  ]);

  assert.equal(ranked[0]?.slug, 'data-analytics-professional-certificate-google');
  assert.equal(ranked[1]?.slug, 'data-science-professional-certificate-ibm');
});
