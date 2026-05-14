import { describe, it, expect } from 'vitest';
import {
  autoMatchOccupationToPrograms,
  buildOccupationTokens,
  inferExperienceBand,
  type OccupationForMatch,
} from '@/lib/career/autoMatch';
import { PROGRAMS } from '@/lib/content/programs';

// ── helpers ──────────────────────────────────────────────────────────────────

function mockOcc(partial: Partial<OccupationForMatch> & { title: string }): OccupationForMatch {
  return {
    description: null,
    jobFamily: null,
    outlookSummary: null,
    skills: [],
    tasks: [],
    technologies: [],
    ...partial,
  };
}

// ── autoMatchOccupationToPrograms ────────────────────────────────────────────

describe('autoMatchOccupationToPrograms', () => {
  it('exact keyword match scores high', () => {
    // Occupation that shares many exact keywords with the Cybersecurity program
    const occ = mockOcc({
      title: 'Cybersecurity Analyst',
      description: 'Protect computer networks and respond to incidents',
      skills: [
        { skillName: 'Linux' },
        { skillName: 'Python' },
        { skillName: 'SQL' },
        { skillName: 'Incident Response' },
      ],
      tasks: [{ taskText: 'Monitor security breaches using Linux and Python' }],
    });

    const results = autoMatchOccupationToPrograms(occ, PROGRAMS);
    const cyber = results.find(
      (r) => r.programSlug === 'cybersecurity-professional-certificate-google'
    );

    expect(cyber).toBeDefined();
    expect(cyber!.score).toBeGreaterThanOrEqual(0.25);
    expect(cyber!.recommendationType).toBe('primary');
  });

  it('partial match scores medium', () => {
    // "linux" and "python" are exact matches against the Cybersecurity program.
    // With 9 unique keywords, score = 2/9 = 0.222 — solidly in the bridge tier.
    const occ = mockOcc({
      title: 'Linux Administrator',
      description: 'Manages servers',
      skills: [{ skillName: 'Python' }],
      tasks: [{ taskText: 'Automate deployments' }],
    });

    const results = autoMatchOccupationToPrograms(occ, PROGRAMS);
    const cyber = results.find(
      (r) => r.programSlug === 'cybersecurity-professional-certificate-google'
    );

    expect(cyber).toBeDefined();
    expect(cyber!.score).toBeGreaterThanOrEqual(0.1);
    expect(cyber!.score).toBeLessThan(0.25);
    expect(cyber!.recommendationType).toBe('bridge');
  });

  it('no match returns empty', () => {
    const occ = mockOcc({
      title: 'Quantum Poet',
      description: 'Writes cosmic verse',
      skills: [{ skillName: 'Rhyme' }],
      tasks: [{ taskText: 'Compose stanzas' }],
    });

    const results = autoMatchOccupationToPrograms(occ, PROGRAMS);
    expect(results).toHaveLength(0);
  });

  it('technology skills boost score', () => {
    const baseOcc = mockOcc({
      title: 'Database Administrator',
      description: 'Manage data systems',
      skills: [{ skillName: 'SQL' }],
      tasks: [{ taskText: 'Optimize queries' }],
    });

    const boostedOcc = mockOcc({
      title: 'Database Administrator',
      description: 'Manage data systems',
      skills: [{ skillName: 'SQL' }],
      tasks: [{ taskText: 'Optimize queries' }],
      technologies: [{ technologyName: 'Tableau' }, { technologyName: 'Python' }],
    });

    const baseResults = autoMatchOccupationToPrograms(baseOcc, PROGRAMS);
    const boostedResults = autoMatchOccupationToPrograms(boostedOcc, PROGRAMS);

    // Find the Data Analytics program in both result sets
    const baseData = baseResults.find(
      (r) => r.programSlug === 'data-analytics-professional-certificate-google'
    );
    const boostedData = boostedResults.find(
      (r) => r.programSlug === 'data-analytics-professional-certificate-google'
    );

    expect(baseData).toBeDefined();
    expect(boostedData).toBeDefined();
    expect(boostedData!.score).toBeGreaterThan(baseData!.score);
  });
});

// ── buildOccupationTokens ────────────────────────────────────────────────────

describe('buildOccupationTokens', () => {
  it('tokenizes title correctly', () => {
    const occ = mockOcc({ title: 'Senior Software Engineer' });
    const tokens = buildOccupationTokens(occ);

    expect(tokens.has('senior')).toBe(true);
    expect(tokens.has('software')).toBe(true);
    expect(tokens.has('engineer')).toBe(true);
    // Short words are dropped
    expect(tokens.has('it')).toBe(false);
  });

  it('extracts skills into tokens', () => {
    const occ = mockOcc({
      title: 'Analyst',
      skills: [
        { skillName: 'Python Programming' },
        { skillName: 'Data Analysis' },
      ],
    });
    const tokens = buildOccupationTokens(occ);

    expect(tokens.has('python')).toBe(true);
    expect(tokens.has('programming')).toBe(true);
    expect(tokens.has('data')).toBe(true);
    expect(tokens.has('analysis')).toBe(true);
  });

  it('includes technologies in token set', () => {
    const occ = mockOcc({
      title: 'Developer',
      technologies: [
        { technologyName: 'React.js' },
        { technologyName: 'Node.js' },
      ],
    });
    const tokens = buildOccupationTokens(occ);

    expect(tokens.has('react')).toBe(true);
    expect(tokens.has('node')).toBe(true);
  });
});

// ── inferExperienceBand ──────────────────────────────────────────────────────

describe('inferExperienceBand', () => {
  it('maps entry-level to beginner', () => {
    const occ = mockOcc({ title: 'Entry-Level Data Analyst' });
    expect(inferExperienceBand(occ)).toBe('beginner');
  });

  it('maps junior to beginner', () => {
    const occ = mockOcc({ title: 'Junior Web Developer' });
    expect(inferExperienceBand(occ)).toBe('beginner');
  });

  it('maps senior to experienced', () => {
    const occ = mockOcc({ title: 'Senior Software Engineer' });
    expect(inferExperienceBand(occ)).toBe('experienced');
  });

  it('maps lead to experienced', () => {
    const occ = mockOcc({ title: 'Lead DevOps Engineer' });
    expect(inferExperienceBand(occ)).toBe('experienced');
  });

  it('defaults to some_experience', () => {
    const occ = mockOcc({ title: 'Software Developer' });
    expect(inferExperienceBand(occ)).toBe('some_experience');
  });
});
