import { describe, expect, it } from 'vitest';
import { getTopProgramsFromQuiz, mergeQuizShortAnswers, scoreQuiz } from '../marketing/src/components/FindYourPathQuiz';

const supportProgram = { slug: 'it-support-professional-certificate-ibm' };

describe('exploration recommendations respect interest and readiness', () => {
  it('does not redirect a new healthcare learner to IT just for being a beginner', () => {
    const answers = mergeQuizShortAnswers({ q1: 'health', q2: 'brand_new', q3: 'as_fast' });
    const result = getTopProgramsFromQuiz(scoreQuiz(answers), answers);
    expect(result[0].category).toBe('healthcare');
    expect(result).toHaveLength(3);
  });

  it('gives a computer beginner an IT foundation before advanced credentials', () => {
    const answers = mergeQuizShortAnswers({ q1: 'computers', q2: 'brand_new', q3: 'as_fast' });
    const result = getTopProgramsFromQuiz(scoreQuiz(answers), answers);
    expect(result[0].slug).toBe(supportProgram.slug);
    expect(result[1].slug).toBe('comptia-a-professional-certificate');
    expect(result[1].extra?.difficulty).toBeLessThan(3);
    expect(new Set(result.map((program) => program.slug)).size).toBe(3);
  });

  it('keeps manufacturing and trades first for a learner interested in hands-on work', () => {
    const answers = mergeQuizShortAnswers({ q1: 'building', q2: 'brand_new', q3: '3_5_months' });
    expect(getTopProgramsFromQuiz(scoreQuiz(answers), answers).every((program) => program.category === 'manufacturing')).toBe(true);
  });
});
