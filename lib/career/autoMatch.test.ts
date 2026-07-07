/**
 * Tests for the structured multi-dimensional O*NET → WorkforceAP program matcher.
 *
 * Dimensions under test:
 *   1. Domain / category bridge
 *   2. Knowledge area overlap
 *   3. Skill direct match
 *   4. Work activity alignment
 *   5. Education / job zone alignment
 *   6. Token overlap (tiebreaker)
 */

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
    jobZone: null,
    skills: [],
    tasks: [],
    technologies: [],
    abilities: [],
    knowledge: [],
    workActivities: [],
    education: [],
    sampleTitles: [],
    ...partial,
  };
}

// ── tokenize ──────────────────────────────────────────────────────────────────

test('tokenize: lowercases and drops short words', () => {
  const out = tokenize('Linux SQL is BIG and tiny');
  assert.deepEqual(new Set(out), new Set(['linux', 'sql', 'big', 'tiny']));
  assert.ok(!out.includes('is'));
  assert.ok(!out.includes('and'));
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
  assert.equal(scoreToRecommendationType(0.25), 'primary');
  assert.equal(scoreToRecommendationType(0.249), 'bridge');
  assert.equal(scoreToRecommendationType(0.1), 'bridge');
  assert.equal(scoreToRecommendationType(0.099), 'stretch');
  assert.equal(scoreToRecommendationType(0), 'stretch');
});

// ── scoreProgram backward-compat ─────────────────────────────────────────────

test('scoreProgram: empty token set yields stretch with zero score', () => {
  const prog = PROGRAMS[0];
  const occ = occupation({ title: 'Entry Level Unknown' });
  const result = scoreProgram(prog, new Set(), occ);
  assert.equal(result.programSlug, prog.slug);
  assert.ok(result.score >= 0);
  assert.equal(result.recommendationType, 'stretch');
  assert.equal(result.experienceBand, 'beginner');
  assert.ok(result.reason.length > 0, 'expected non-empty reason');
});

test('scoreProgram: full-overlap reasoning lists matched terms', () => {
  // Pick a real program and feed back its own keywords; structured scorer
  // weights token overlap at 0.05 so score stays modest unless other
  // dimensions also fire.
  const prog = PROGRAMS[0];
  assert.ok(prog, 'expected at least one program in catalog');
  const keywords = buildProgramKeywords(prog);
  const occ = occupation({
    title: prog.title,
    description: keywords.join(' '),
    skills: prog.skills.map((s) => ({ skillName: s })),
  });
  const occTokens = buildOccupationTokens(occ);
  const result = scoreProgram(prog, occTokens, occ);
  // With token overlap as only 5% weight, score lands around 0.1–0.2
  assert.ok(result.score >= 0.08, `expected modest overlap, got ${result.score}`);
  assert.ok(result.reason.length > 0, 'expected non-empty reason');
  assert.match(result.reason, /Token overlap|domain|Knowledge|Skill|Work activity|Education/i);
});

// ── Dimension 1: Domain bridge ───────────────────────────────────────────────

test('rankPrograms: IT occupation bridges to IT programs via domain', () => {
  const occ = occupation({
    title: 'Computer Network Support Specialists',
    description: 'Provide technical assistance to computer users.',
    jobFamily: 'Computer Mathematical Occupations',
    skills: [{ skillName: 'Networking' }, { skillName: 'Hardware' }],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  assert.ok(matches.length > 0, 'expected at least one match');

  // IT programs should appear due to domain bridge
  const itSlugs = new Set([
    'it-support-professional-certificate-ibm',
    'comptia-a-professional-certificate',
    'comptia-network-professional-certificate',
    'cybersecurity-professional-certificate-google',
  ]);
  const foundIt = matches.some((m) => itSlugs.has(m.programSlug));
  assert.ok(foundIt, `expected at least one IT program in matches: ${matches.map((m) => m.programSlug).join(', ')}`);
});

// ── Dimension 2: Knowledge area overlap ─────────────────────────────────────

test('rankPrograms: knowledge areas boost healthcare match', () => {
  const occ = occupation({
    title: 'Medical Records Specialists',
    description: 'Compile, process, and maintain medical records.',
    knowledge: [
      { name: 'Medicine and Dentistry', importance: 85, level: 70 },
      { name: 'Clerical', importance: 75, level: 65 },
      { name: 'Customer and Personal Service', importance: 60, level: 50 },
    ],
    skills: [{ skillName: 'Medical coding' }, { skillName: 'EHR' }],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  const hit = matches.find((m) => m.programSlug === 'health-information-technology-mchit');
  assert.ok(hit, 'health-information-technology-mchit should match via knowledge areas');
  assert.ok(hit.score >= 0.1, `expected at least bridge score, got ${hit.score}`);
});

// ── Dimension 3: Skill direct match ───────────────────────────────────────────

test('rankPrograms: skill direct match boosts cybersecurity program', () => {
  const occ = occupation({
    title: 'Information Security Analysts',
    description: 'Plan and carry out security measures to protect computer networks.',
    abilities: [
      { name: 'Network Security', importance: 90, level: 80 },
      { name: 'Linux', importance: 75, level: 65 },
      { name: 'Python', importance: 70, level: 60 },
      { name: 'Incident Response', importance: 85, level: 75 },
    ],
    knowledge: [
      { name: 'Computers and Electronics', importance: 95, level: 85 },
      { name: 'Telecommunications', importance: 70, level: 60 },
    ],
    workActivities: [
      { name: 'Interacting With Computers', importance: 95, level: 90 },
      { name: 'Monitoring Processes, Materials, or Surroundings', importance: 85, level: 80 },
    ],
    skills: [
      { skillName: 'Network Security' },
      { skillName: 'Linux' },
      { skillName: 'Python' },
      { skillName: 'Incident Response' },
    ],
    tasks: [
      { taskText: 'Monitor networks for security breaches.' },
      { taskText: 'Install security software and firewalls.' },
    ],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  const cyberHit = matches.find((m) => m.programSlug === 'cybersecurity-professional-certificate-google');
  assert.ok(cyberHit, 'cybersecurity program should appear in matches');
  assert.ok(cyberHit.score >= 0.25, `expected primary tier, got score=${cyberHit.score}`);
  assert.equal(cyberHit.recommendationType, 'primary');

  // Dimension breakdown should be present
  assert.ok(cyberHit.dimensionBreakdown, 'expected dimension breakdown');
  assert.ok(
    cyberHit.dimensionBreakdown!.some((d) => d.name === 'Skill match' && d.score > 0.05),
    'expected skill match dimension to contribute'
  );
});

// ── Dimension 4: Work activity alignment ─────────────────────────────────────

test('rankPrograms: work activities boost business programs', () => {
  const occ = occupation({
    title: 'Project Management Specialists',
    workActivities: [
      { name: 'Organizing, Planning, and Prioritizing Work', importance: 90, level: 85 },
      { name: 'Coordinating the Work and Activities of Others', importance: 85, level: 80 },
      { name: 'Communicating with Supervisors, Peers, or Subordinates', importance: 80, level: 75 },
    ],
    skills: [{ skillName: 'Project management' }, { skillName: 'Agile' }],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  const pmHit = matches.find((m) => m.programSlug === 'project-management-professional-certificate-microsoft');
  assert.ok(pmHit, 'project management program should match via work activities');
  assert.ok(pmHit.score >= 0.1, `expected at least bridge score, got ${pmHit.score}`);
});

// ── Dimension 5: Education / job zone alignment ──────────────────────────────

test('rankPrograms: job zone alignment affects score', () => {
  const occ = occupation({
    title: 'Senior Cloud Architect',
    jobZone: 4,
    skills: [{ skillName: 'AWS' }, { skillName: 'Cloud architecture' }],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  const awsHit = matches.find((m) => m.programSlug === 'aws-cloud-technology-amazon');
  assert.ok(awsHit, 'AWS program should appear');
  // Job zone 4 (experienced) vs AWS program difficulty (advanced≈4) → aligned
  assert.ok(
    awsHit.dimensionBreakdown!.some((d) => d.name === 'Education/zone' && d.score >= 0.5),
    'expected education/zone dimension to show alignment'
  );
});

// ── Dimension 6: Token overlap (tiebreaker) ──────────────────────────────────

test('rankPrograms: token overlap still contributes as tiebreaker', () => {
  const occ = occupation({
    title: 'Software Developer',
    description: 'Develop applications using Python, JavaScript, HTML, CSS, databases.',
    skills: [
      { skillName: 'Python' },
      { skillName: 'JavaScript' },
      { skillName: 'HTML' },
      { skillName: 'Databases' },
    ],
    tasks: [{ taskText: 'Write software code applications.' }],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  assert.ok(matches.length >= 2, 'expected multiple matches');
  for (let i = 1; i < matches.length; i += 1) {
    assert.ok(
      matches[i - 1].score >= matches[i].score,
      `matches must be sorted by descending score: ${matches[i - 1].score} >= ${matches[i].score}`
    );
  }

  const devHit = matches.find((m) => m.programSlug === 'software-developer-professional-certificate-ibm');
  assert.ok(devHit, 'software developer program should rank');
});

// ── Real occupation tests ─────────────────────────────────────────────────────

test('rankPrograms: 15-1231.00 Computer Network Support Specialists', () => {
  const occ = occupation({
    title: 'Computer Network Support Specialists',
    description: 'Analyze, test, troubleshoot, and evaluate existing network systems.',
    jobFamily: 'Computer and Mathematical Occupations',
    jobZone: 3,
    knowledge: [
      { name: 'Computers and Electronics', importance: 90, level: 80 },
      { name: 'Telecommunications', importance: 80, level: 70 },
      { name: 'Customer and Personal Service', importance: 60, level: 50 },
    ],
    abilities: [
      { name: 'Network', importance: 85, level: 75 },
      { name: 'Troubleshooting', importance: 80, level: 70 },
      { name: 'Customer Service', importance: 65, level: 55 },
    ],
    workActivities: [
      { name: 'Interacting With Computers', importance: 95, level: 90 },
      { name: 'Repairing and Maintaining Electronic Equipment', importance: 80, level: 70 },
    ],
    skills: [
      { skillName: 'Networking' },
      { skillName: 'TCP/IP' },
      { skillName: 'Customer service' },
    ],
    tasks: [
      { taskText: 'Test and evaluate network systems.' },
      { taskText: 'Troubleshoot network problems.' },
    ],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  assert.ok(matches.length > 0);
  const itHit = matches.find((m) => m.programSlug === 'it-support-professional-certificate-ibm');
  assert.ok(itHit, 'IT Support should match for network support specialists');
});

test('rankPrograms: 15-1212.00 Information Security Analysts', () => {
  const occ = occupation({
    title: 'Information Security Analysts',
    description: 'Plan, implement, upgrade, and monitor security measures.',
    jobFamily: 'Computer and Mathematical Occupations',
    jobZone: 4,
    knowledge: [
      { name: 'Computers and Electronics', importance: 95, level: 90 },
      { name: 'Telecommunications', importance: 70, level: 60 },
      { name: 'Administration and Management', importance: 50, level: 40 },
    ],
    abilities: [
      { name: 'Network Security', importance: 90, level: 85 },
      { name: 'Linux', importance: 75, level: 65 },
      { name: 'Python', importance: 60, level: 50 },
      { name: 'Incident Response', importance: 85, level: 80 },
    ],
    workActivities: [
      { name: 'Interacting With Computers', importance: 95, level: 90 },
      { name: 'Monitoring Processes, Materials, or Surroundings', importance: 90, level: 85 },
    ],
    skills: [
      { skillName: 'Network security' },
      { skillName: 'Linux' },
      { skillName: 'SQL' },
      { skillName: 'Incident response' },
    ],
    tasks: [
      { taskText: 'Monitor networks for security breaches.' },
      { taskText: 'Develop security standards and best practices.' },
    ],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  const cyberHit = matches.find((m) => m.programSlug === 'cybersecurity-professional-certificate-google');
  assert.ok(cyberHit, 'Cybersecurity program should match');
  assert.ok(cyberHit.score >= 0.25, `expected primary tier, got ${cyberHit.score}`);
});

test('rankPrograms: 29-2072.00 Medical Records Specialists', () => {
  const occ = occupation({
    title: 'Medical Records Specialists',
    description: 'Compile, process, and maintain medical records.',
    jobFamily: 'Healthcare Support Occupations',
    jobZone: 2,
    knowledge: [
      { name: 'Medicine and Dentistry', importance: 75, level: 65 },
      { name: 'Clerical', importance: 80, level: 70 },
      { name: 'Customer and Personal Service', importance: 60, level: 50 },
    ],
    abilities: [
      { name: 'Medical Coding', importance: 80, level: 70 },
      { name: 'HIPAA', importance: 85, level: 75 },
    ],
    workActivities: [
      { name: 'Processing Information', importance: 90, level: 85 },
      { name: 'Documenting/Recording Information', importance: 85, level: 80 },
    ],
    skills: [
      { skillName: 'Medical coding' },
      { skillName: 'EHR' },
      { skillName: 'HIPAA' },
    ],
    tasks: [
      { taskText: 'Assign codes to diagnoses and procedures.' },
      { taskText: 'Protect the security of medical records.' },
    ],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  const hit = matches.find((m) => m.programSlug === 'health-information-technology-mchit');
  assert.ok(hit, 'Health IT program should match for medical records specialists');
});

test('rankPrograms: 47-2061.00 Construction Laborers', () => {
  const occ = occupation({
    title: 'Construction Laborers',
    description: 'Perform tasks involving physical labor at construction sites.',
    jobFamily: 'Construction and Extraction Occupations',
    jobZone: 1,
    knowledge: [
      { name: 'Building and Construction', importance: 80, level: 70 },
      { name: 'Mechanical', importance: 60, level: 50 },
    ],
    abilities: [
      { name: 'Safety', importance: 85, level: 75 },
      { name: 'Blueprint Reading', importance: 70, level: 60 },
    ],
    workActivities: [
      { name: 'Performing General Physical Activities', importance: 90, level: 85 },
      { name: 'Handling and Moving Objects', importance: 85, level: 80 },
      { name: 'Inspecting Equipment, Structures, or Materials', importance: 70, level: 60 },
    ],
    skills: [
      { skillName: 'OSHA-10' },
      { skillName: 'Blueprint reading' },
      { skillName: 'Construction fundamentals' },
    ],
    tasks: [
      { taskText: 'Clean and prepare construction sites.' },
      { taskText: 'Follow safety procedures and OSHA guidelines.' },
    ],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  const hit = matches.find((m) => m.programSlug === 'core-construction-training-certificate');
  assert.ok(hit, 'Core Construction program should match for construction laborers');
});

// ── rankPrograms edge cases ────────────────────────────────────────────────────

test('rankPrograms: returns at most TOP_N (8) matches', () => {
  const occ = occupation({
    title: 'Computer Information Technology Professional',
    description: 'Software hardware networking python javascript security cloud database analytics design project management',
    skills: PROGRAMS.flatMap((p) => p.skills.map((s) => ({ skillName: s }))),
    tasks: [{ taskText: 'Computer information technology software hardware cloud security' }],
  });

  const matches = rankPrograms(occ, PROGRAMS);
  assert.ok(matches.length <= 8, `expected <= 8 matches, got ${matches.length}`);
});

test('rankPrograms: filters out scores below MIN_INCLUDED_SCORE', () => {
  const occ = occupation({ title: 'XX' });
  const matches = rankPrograms(occ, PROGRAMS);
  for (const m of matches) {
    assert.ok(m.score >= 0.04, `expected score >= 0.04, got ${m.score} for ${m.programSlug}`);
  }
});

// ── buildOccupationTokens ─────────────────────────────────────────────────────

test('buildOccupationTokens: combines all metadata fields including taxonomy', () => {
  const occ = occupation({
    title: 'Healthcare',
    description: 'Medical records technician',
    jobFamily: 'Healthcare Support',
    outlookSummary: 'Growing rapidly',
    skills: [{ skillName: 'HIPAA' }, { skillName: 'EHR' }],
    tasks: [{ taskText: 'Process billing claims' }],
    abilities: [{ name: 'Medical Terminology', importance: 80, level: 70 }],
    knowledge: [{ name: 'Medicine and Dentistry', importance: 85, level: 75 }],
    workActivities: [{ name: 'Processing Information', importance: 90, level: 85 }],
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
  // Taxonomy tokens
  assert.ok(tokens.has('medical') || tokens.has('terminology'));
  assert.ok(tokens.has('medicine') || tokens.has('dentistry'));
  assert.ok(tokens.has('processing') || tokens.has('information'));
});
