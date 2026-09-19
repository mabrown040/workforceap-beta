import test from 'node:test';
import assert from 'node:assert/strict';
import { humanizeProgramSlug, programDisplayTitle } from './programTitle';
import { getProgramBySlug } from './programs';

test('programDisplayTitle: canonical slug resolves to the catalog title', () => {
  assert.equal(
    programDisplayTitle('aws-cloud-technology-amazon'),
    getProgramBySlug('aws-cloud-technology-amazon')?.title,
  );
});

test('programDisplayTitle: legacy IBM alias displays as the AWS program title (alias table unchanged)', () => {
  const aws = getProgramBySlug('ai-practitioner-professional-certificate-aws');
  assert.ok(aws, 'AWS AI Practitioner program must exist in the catalog');
  assert.equal(programDisplayTitle('ai-professional-developer-certificate-ibm'), aws.title);
  assert.equal(programDisplayTitle('  AI-Professional-Developer-Certificate-IBM '), aws.title);
});

test('programDisplayTitle: unknown slug is humanised, never echoed raw', () => {
  assert.equal(programDisplayTitle('cybersecurity-google'), 'Cybersecurity Google');
  assert.equal(programDisplayTitle('google-it-support-certificate'), 'Google IT Support Certificate');
  assert.equal(programDisplayTitle('data-analytics-google'), 'Data Analytics Google');
  assert.ok(!/-[a-z]/.test(programDisplayTitle('cybersecurity-google')));
});

test('programDisplayTitle: a stored full title still resolves through the catalog', () => {
  const comptia = getProgramBySlug('comptia-a-professional-certificate');
  assert.ok(comptia);
  assert.equal(programDisplayTitle(comptia.title), comptia.title);
});

test('humanizeProgramSlug: keeps vendor acronyms and lowercases joiners', () => {
  assert.equal(humanizeProgramSlug('ai-and-software-development-ibm'), 'AI and Software Development IBM');
  assert.equal(humanizeProgramSlug('it-automation-with-python'), 'IT Automation with Python');
  assert.equal(humanizeProgramSlug('comptia-a-plus'), 'CompTIA A Plus');
  assert.equal(humanizeProgramSlug(''), '');
});
