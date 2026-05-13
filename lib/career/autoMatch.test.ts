import assert from 'node:assert/strict';
import test from 'node:test';

import { PROGRAMS } from '@/lib/content/programs';
import {
  buildOccupationTokens,
  buildProgramKeywords,
  rankPrograms,
  scoreProgram,
  scoreToRecommendationType,
  tokenize,
  type OccupationForMatch,
} from './autoMatch';

// ── helpers ──────────────────────────────────────────────────────────────────

function occupation(partial: Partial<OccupationForMatch> & { title: string }): OccupationForMatch {
  return {
    description: null,
    jobFamily: null,
    outlookSummary: null,
    skills: [],
    tasks: [],
    ...partial,
  };
}

// ── tokenize ──────────────────────────────────────────────────────────────────

test('tokenize: lowercases and drops short words', () => {
  const out = tokenize('Linux SQL is BIG and tiny');
  assert.deepEqual(new Set(out), new Set(['linux', 'tiny']));
  // "sql", "big", "and", "is" are all <= 3 chars and dropped
  assert.ok(!out.includes('sql'));
  assert.ok(!out.includes('big'));
});

test('tokenize: splits on non-word boundaries', () => {
  const out = tokenize('cyber-security/network,security');
  assert.ok(out.includes('cyber'));
  assert.ok(out.includes('security'));
  assert.ok(out.includes('network'));
});

// ── scoreToRecommendationType ─────────────────────────────────────────────────

test('scoreToRecommendationType: tier boundaries', () => {
  assert.equal(scoreToRecommendationType(0.5), 'primary');
  assert.equal(scoreToRecommendationType(0.25), 'primary'); // boundary inclusive
  assert.equal(scoreToRecommendationType(0.249), 'bridge');
  assert.equal(scoreToRecommendationType(0.1), 'bridge'); // boundary inclusive
  assert.equal(scoreToRecommendationType(0.099), 'stretch');
  assert.equal(scoreToRecommendationType(0), 'stretch');
});

// ── scoreProgram ──────────────────────────────────────────────────────────────

test('scoreProgram: empty token set yields stretch with zero score', () => {
  const prog = PROGRAMS[0];
  const result = scoreProgram(prog, new Set());
  assert.equal(result.programSlug, prog.slug);
  assert.equal(result.score, 0);
  assert.equal(result.recommendationType, 'stretch');
  assert.equal(result.experienceBand, 'beginner');
  assert.match(result.reason, /Low keyword overlap/);
});

test('scoreProgram: full-overlap reasoning lists matched terms', () => {
  // Pick a real program and feed back its own keywords; full overlap → score=1.
  const prog = PROGRAMS[0];
  assert.ok(prog, 'expected at least one program in catalog');
  const keywords = buildProgramKeywords(prog);
  const result = scoreProgram(prog, new Set(keywords));
  assert.equal(result.score, 1);
  assert.equal(result.recommendationType, 'primary');
  assert.match(result.reason, /Shares \d+ keywords? including/);
});

// ── rankPrograms — known O*NET → expected program ─────────────────────────────

test('rankPrograms: cybersecurity occupation matches Cybersecurity program first', () => {
  // 15-1212.00 — Information Security Analysts (real O*NET code) — synthetic blob
  const occ = occupation({
    title: 'Information Security Analysts',
    description:
      'Plan, implement, upgrade, monitor security measures protect computer networks information.',
    jobFamily: 'Computer Mathematical Occupations',
    skills: [
      { skillName: 'Network Security' },
      { skillName: 'Linux' },
      { skillName: 'Python' },
      { skillName: 'Incident Response' },
      { skillName: 'Cybersecurity' },
    ],
    tasks: [
      { taskText: 'Monitor networks security breaches investigate violations occur.' },
      { taskText: 'Install security software firewalls protect computer systems networks.' },
    ],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  assert.ok(matches.length > 0, 'expected at least one match');

  // The Cybersecurity Google program lists Linux, Python, Incident response — must rank.
  const cyberHit = matches.find((m) => m.programSlug === 'cybersecurity-professional-certificate-google');
  assert.ok(cyberHit, `cybersecurity-professional-certificate-google should appear in matches: ${matches.map((m) => m.programSlug).join(', ')}`);

  // Strong overlap should clear the primary threshold.
  assert.ok(cyberHit.score >= 0.25, `expected primary tier, got score=${cyberHit.score}`);
  assert.equal(cyberHit.recommendationType, 'primary');
});

test('rankPrograms: orders by descending score', () => {
  const occ = occupation({
    title: 'Software Developer',
    description: 'Develop applications using Python, JavaScript, HTML, CSS, databases. Software engineering.',
    skills: [
      { skillName: 'Python' },
      { skillName: 'JavaScript' },
      { skillName: 'HTML' },
      { skillName: 'Databases' },
    ],
    tasks: [{ taskText: 'Write software code applications.' }],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  assert.ok(matches.length >= 2, 'expected multiple matches for a generic software occupation');
  for (let i = 1; i < matches.length; i += 1) {
    assert.ok(
      matches[i - 1].score >= matches[i].score,
      `matches must be sorted by descending score: ${matches[i - 1].score} >= ${matches[i].score}`
    );
  }
});

test('rankPrograms: returns at most TOP_N (8) matches', () => {
  // Occupation that overlaps with many programs.
  const occ = occupation({
    title: 'Computer Information Technology Professional',
    description:
      'Software hardware networking python javascript security cloud database analytics design project management',
    skills: PROGRAMS.flatMap((p) => p.skills.map((s) => ({ skillName: s }))),
    tasks: [{ taskText: 'Computer information technology software hardware cloud security' }],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  assert.ok(matches.length <= 8, `expected <= 8 matches, got ${matches.length}`);
});

test('rankPrograms: filters out scores below MIN_INCLUDED_SCORE', () => {
  const occ = occupation({ title: 'XX' });
  // Empty title (after tokenization) → no overlap → no matches.
  const matches = rankPrograms(occ, PROGRAMS);
  for (const m of matches) {
    assert.ok(m.score >= 0.04, `expected score >= 0.04, got ${m.score} for ${m.programSlug}`);
  }
});

// ── buildOccupationTokens ─────────────────────────────────────────────────────

test('buildOccupationTokens: combines all metadata fields', () => {
  const occ = occupation({
    title: 'Healthcare',
    description: 'Medical records technician',
    jobFamily: 'Healthcare Support',
    outlookSummary: 'Growing rapidly',
    skills: [{ skillName: 'HIPAA' }, { skillName: 'EHR' }],
    tasks: [{ taskText: 'Process billing claims' }],
  });
  const tokens = buildOccupationTokens(occ);
  assert.ok(tokens.has('healthcare'));
  assert.ok(tokens.has('medical'));
  assert.ok(tokens.has('records'));
  assert.ok(tokens.has('technician'));
  assert.ok(tokens.has('hipaa'));
  assert.ok(tokens.has('billing'));
  assert.ok(tokens.has('claims'));
  assert.ok(tokens.has('growing'));
  assert.ok(tokens.has('rapidly'));
});
