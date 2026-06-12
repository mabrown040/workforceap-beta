import assert from 'node:assert/strict';
import test from 'node:test';

import { scoreStructural } from './structural';
import { parseResume } from './parse';

const MIKE_RESUME = `Michael Brown II, MBA
Contact Information
512.629.1505 | Tulsa, OK | mabrown040@gmail.com

Professional Summary
Results-driven enterprise sales professional with 6+ years of experience driving pipeline growth, expanding strategic accounts, and exceeding sales quotas in B2B SaaS.

Experience
Founding Account Executive | Contango IT | Remote
Aug 2024 - Present
• Exceeded quota in ramp, Q1 2025, and Q2 2025 through targeted prospecting, strategic account development, and disciplined pipeline management.
• Managed full-cycle sales activity across SMB and mid-market opportunities, identifying business pain points and aligning solutions to customer goals.
• Created proposals, presentations, and client-facing recommendations that advanced deals and strengthened account relationships.

Enterprise Sales Development Representative | Applitools | Remote
Mar 2022 - Aug 2024
• Generated over $5M in qualified pipeline and achieved 110%+ of quota through enterprise outbound prospecting and strategic account penetration.
• Expanded opportunities within Fortune 500 accounts, including Amazon and Bank of America, by identifying new business units, stakeholders, and use cases.

Education
Master of Business Administration (MBA) | Abilene Christian University | Dec 2023
B.A. in Business Economics, Minor in Computer Science | Wofford College | Jun 2020

Skills
Salesforce, Sales Navigator, Outreach, Tableau, Python, HTML
`;

const SPARSE_RESUME = `Jane Doe

Experience
Engineer | Acme | 2023 - Present
• Responsible for writing code across the backend systems daily.
• Helped with various team initiatives related to platform reliability.
• Worked closely with senior engineers to ship features on schedule.

Education
BS Computer Science | State University | 2022
`;

test('parseResume detects sections + bullets + contact', () => {
  const f = parseResume(MIKE_RESUME);
  const sectionNames = f.sections.map((s) => s.normalized);
  assert.ok(sectionNames.includes('summary'));
  assert.ok(sectionNames.includes('experience'));
  assert.ok(sectionNames.includes('education'));
  assert.ok(sectionNames.includes('skills'));
  assert.equal(f.contact.email, 'mabrown040@gmail.com');
  assert.ok(f.contact.phone, 'should parse phone');
  assert.ok(f.contact.cityState, 'should parse city state');
  assert.equal(f.contact.linkedinUrl, null, 'no linkedin in this resume');
  assert.ok(f.bullets.length >= 5, `expected 5+ bullets, got ${f.bullets.length}`);
});

test('scoreStructural composite for Mike resume is in 60-95 band', () => {
  const r = scoreStructural(MIKE_RESUME);
  assert.ok(r.composite >= 60 && r.composite <= 95, `unexpected composite ${r.composite}`);
});

test('contact subscore penalizes missing linkedin for Mike resume', () => {
  const r = scoreStructural(MIKE_RESUME);
  // Mike has email + phone + city = 75, missing linkedin = -25
  assert.ok(r.breakdown.contact.score >= 70 && r.breakdown.contact.score < 90);
  assert.ok(r.breakdown.contact.notes.some((n) => /linkedin/i.test(n)));
});

test('quantification detects metrics in Applitools $5M bullet', () => {
  const r = scoreStructural(MIKE_RESUME);
  const metricBullets = r.features.bullets.filter((b) => b.hasMetric);
  assert.ok(metricBullets.some((b) => /\$5M/i.test(b.text)));
});

test('weak verbs are flagged on sparse resume', () => {
  const r = scoreStructural(SPARSE_RESUME);
  assert.ok(r.breakdown.actionVerbs.notes.some((n) => /weak verbs/i.test(n)));
});

test('missing required sections flagged on sparse resume', () => {
  const r = scoreStructural(SPARSE_RESUME);
  assert.ok(r.breakdown.structure.notes.some((n) => /skills/i.test(n)));
  // Sparse resume composite should be low
  assert.ok(r.composite < 55, `sparse composite ${r.composite} should be <55`);
});

test('composite is deterministic across runs', () => {
  const a = scoreStructural(MIKE_RESUME);
  const b = scoreStructural(MIKE_RESUME);
  assert.equal(a.composite, b.composite);
  assert.deepEqual(a.breakdown.contact.score, b.breakdown.contact.score);
});

test('empty/whitespace resume returns near-zero', () => {
  const r = scoreStructural('   \n   \n');
  assert.ok(r.composite < 20);
});

test('flat single-blob resume (PDF copy/paste) recovers via reflow instead of scoring zero', () => {
  // Simulates PDF copy/paste stripping every newline — the exact failure that
  // scored a real resume 19/100 with four zero subscores in production.
  const flattened = MIKE_RESUME.replace(/\s*\n\s*/g, ' ').trim();
  const features = parseResume(flattened);
  assert.equal(features.reflowed, true);
  assert.ok(features.sections.length >= 3, `expected >=3 sections, got ${features.sections.length}`);
  assert.ok(features.bullets.length >= 3, `expected >=3 bullets, got ${features.bullets.length}`);

  const r = scoreStructural(flattened);
  assert.ok(r.composite >= 40, `reflowed composite ${r.composite} should be >=40`);
  assert.ok(r.breakdown.quantification.score > 0, 'quantification should detect metrics after reflow');
  assert.ok(
    r.breakdown.structure.notes.some((n) => /line breaks/i.test(n)),
    'structure notes should explain the reflow to the member',
  );
});

test('reflow does not trigger on well-formatted resumes', () => {
  const features = parseResume(MIKE_RESUME);
  assert.ok(!features.reflowed);
});
