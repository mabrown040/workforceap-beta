import { parseResume } from './parse';
import { ACTION_VERBS, WEAK_VERBS } from './actionVerbs';
import type { ResumeFeatures, StructuralScore, StructuralSubscore } from './types';

const REQUIRED_SECTIONS: Array<'experience' | 'education' | 'skills'> = ['experience', 'education', 'skills'];
const RECOMMENDED_SECTIONS: Array<'summary' | 'certifications'> = ['summary', 'certifications'];

function scoreStructure(f: ResumeFeatures): StructuralSubscore {
  const notes: string[] = [];
  if (f.reflowed) {
    notes.push(
      'Your resume text arrived without line breaks (common with PDF copy/paste) — we reconstructed the layout, so formatting scores are approximate. For best results, paste with original line breaks.',
    );
  }
  const seen = new Set(f.sections.map((s) => s.normalized));
  let points = 0;
  const max = REQUIRED_SECTIONS.length * 20 + RECOMMENDED_SECTIONS.length * 10;
  for (const r of REQUIRED_SECTIONS) {
    if (seen.has(r)) points += 20;
    else notes.push(`Missing required section: ${r}`);
  }
  for (const r of RECOMMENDED_SECTIONS) {
    if (seen.has(r)) points += 10;
    else notes.push(`Recommended section missing: ${r}`);
  }
  if (f.dateRanges.length === 0 && seen.has('experience')) {
    notes.push('No parseable date ranges found in experience');
  }
  return { score: Math.round((points / max) * 100), weight: 0.20, notes };
}

function scoreQuantification(f: ResumeFeatures): StructuralSubscore {
  const notes: string[] = [];
  const bullets = f.bullets;
  if (bullets.length === 0) {
    return { score: 0, weight: 0.25, notes: ['No achievement bullets detected'] };
  }
  const withMetric = bullets.filter((b) => b.hasMetric).length;
  const ratio = withMetric / bullets.length;
  // Target 60%+ quantified for a strong score. 0% = 0, 30% = 50, 60% = 90, 80%+ = 100.
  let score: number;
  if (ratio >= 0.8) score = 100;
  else if (ratio >= 0.6) score = 90 + (ratio - 0.6) * 50;
  else if (ratio >= 0.3) score = 50 + (ratio - 0.3) * (40 / 0.3);
  else score = ratio * (50 / 0.3);
  score = Math.round(score);
  notes.push(`${withMetric} of ${bullets.length} bullets contain a metric (${Math.round(ratio * 100)}%)`);
  if (ratio < 0.6) {
    const weak = bullets.filter((b) => !b.hasMetric).slice(0, 3).map((b) => `  • L${b.line}: "${b.text.slice(0, 80)}${b.text.length > 80 ? '...' : ''}"`);
    notes.push('Bullets that could use a number:');
    notes.push(...weak);
  }
  return { score, weight: 0.25, notes };
}

function scoreActionVerbs(f: ResumeFeatures): StructuralSubscore {
  const notes: string[] = [];
  const bullets = f.bullets;
  if (bullets.length === 0) {
    return { score: 0, weight: 0.20, notes: ['No bullets to evaluate'] };
  }
  const strong = bullets.filter((b) => b.startsWithActionVerb).length;
  const weakStarts = bullets.filter((b) => WEAK_VERBS.has(b.firstWord));
  const ratio = strong / bullets.length;
  let score = Math.round(ratio * 100);
  if (weakStarts.length > 0) {
    score = Math.max(0, score - weakStarts.length * 5);
    notes.push(`${weakStarts.length} bullet(s) start with weak verbs (responsible/helped/assisted/etc.):`);
    weakStarts.slice(0, 3).forEach((b) => notes.push(`  • L${b.line}: "${b.firstWord}..."`));
  }
  notes.push(`${strong} of ${bullets.length} bullets start with strong action verbs (${Math.round(ratio * 100)}%)`);
  return { score, weight: 0.15, notes };
}

function scoreBulletLength(f: ResumeFeatures): StructuralSubscore {
  const notes: string[] = [];
  const bullets = f.bullets;
  if (bullets.length === 0) {
    return { score: 0, weight: 0.15, notes: ['No bullets to evaluate'] };
  }
  // Target 8-25 words. Outside that range loses points.
  let inRange = 0;
  let tooShort = 0;
  let tooLong = 0;
  for (const b of bullets) {
    if (b.words < 8) tooShort++;
    else if (b.words > 25) tooLong++;
    else inRange++;
  }
  const score = Math.round((inRange / bullets.length) * 100);
  notes.push(`Bullet length: ${inRange} ideal, ${tooShort} too short (<8 words), ${tooLong} too long (>25 words)`);
  if (tooLong > 0) {
    const ex = bullets.filter((b) => b.words > 25).slice(0, 2);
    ex.forEach((b) => notes.push(`  • L${b.line} (${b.words} words): split into two bullets`));
  }
  return { score, weight: 0.15, notes };
}

function scoreContact(f: ResumeFeatures): StructuralSubscore {
  const notes: string[] = [];
  let points = 0;
  const max = 100;
  if (f.contact.email) points += 30;
  else notes.push('No email detected — ATS may filter');
  if (f.contact.phone) points += 25;
  else notes.push('No phone number detected');
  if (f.contact.linkedinUrl) points += 25;
  else notes.push('No LinkedIn URL — recruiters expect this');
  if (f.contact.cityState) points += 20;
  else notes.push('No city/state detected (helps with location-based ATS filters)');
  return { score: Math.round((points / max) * 100), weight: 0.25, notes };
}

export function scoreStructural(rawText: string): StructuralScore {
  const features = parseResume(rawText);
  const breakdown = {
    structure: scoreStructure(features),
    quantification: scoreQuantification(features),
    actionVerbs: scoreActionVerbs(features),
    bulletLength: scoreBulletLength(features),
    contact: scoreContact(features),
  };
  // Weights sum to 1.0
  let composite = 0;
  for (const sub of Object.values(breakdown)) {
    composite += sub.score * sub.weight;
  }
  return {
    composite: Math.round(composite),
    breakdown,
    features,
  };
}

export { ACTION_VERBS, WEAK_VERBS };
