/**
 * Find Your Path quiz scoring logic.
 * Maps answers to program category weights.
 */

export const CATEGORY_KEYS = [
  'it-cyber',
  'ai-software',
  'cloud-data',
  'business',
  'healthcare',
  'manufacturing',
  'digital-literacy',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export type CategoryWeights = Record<CategoryKey, number>;

export function createEmptyWeights(): CategoryWeights {
  return {
    'it-cyber': 0,
    'ai-software': 0,
    'cloud-data': 0,
    business: 0,
    healthcare: 0,
    manufacturing: 0,
    'digital-literacy': 0,
  };
}

type Q1Answer = 'computers' | 'health' | 'building' | 'managing' | 'data' | 'not_sure';
type Q2Answer = 'brand_new' | 'some_knowledge' | 'work_experience' | 'certifications';
type Q3Answer = 'as_fast' | '3_5_months' | 'planning_ahead' | 'employed_switch';
type Q4Answer = 'salary' | 'stability' | 'remote' | 'community' | 'hands';
type Q5Answer = 'comfortable' | 'basic_apps' | 'tech_savvy' | 'basics';

export type QuizAnswers = {
  q1: Q1Answer;
  q2: Q2Answer;
  q3: Q3Answer;
  q4: Q4Answer;
  q5: Q5Answer;
};

export function scoreQuiz(answers: QuizAnswers): CategoryWeights {
  const w = createEmptyWeights();

  // Q1
  switch (answers.q1) {
    case 'computers':
      w['it-cyber'] += 3;
      w['ai-software'] += 2;
      break;
    case 'health':
      w.healthcare += 4;
      break;
    case 'building':
      w.manufacturing += 4;
      break;
    case 'managing':
      w.business += 3;
      break;
    case 'data':
      w['cloud-data'] += 3;
      w['ai-software'] += 2;
      break;
    case 'not_sure':
      CATEGORY_KEYS.forEach((k) => (w[k] += 1));
      break;
  }

  // Q2
  switch (answers.q2) {
    case 'brand_new':
      w['digital-literacy'] += 2;
      break;
    case 'some_knowledge':
      w['it-cyber'] += 1;
      w['cloud-data'] += 1;
      w.business += 1;
      break;
    case 'work_experience':
      w['ai-software'] += 1;
      w['cloud-data'] += 1;
      break;
    case 'certifications':
      w['ai-software'] += 2;
      w['cloud-data'] += 2;
      break;
  }

  // Q3
  switch (answers.q3) {
    case 'as_fast':
      w['digital-literacy'] += 2;
      w['it-cyber'] += 1;
      break;
    case '3_5_months':
      w['it-cyber'] += 1;
      w['cloud-data'] += 1;
      w.business += 1;
      break;
    case 'planning_ahead':
      w['ai-software'] += 1;
      w['cloud-data'] += 1;
      break;
    case 'employed_switch':
      w.business += 1;
      break;
  }

  // Q4
  switch (answers.q4) {
    case 'salary':
      w['cloud-data'] += 2;
      w['ai-software'] += 2;
      break;
    case 'stability':
      w['it-cyber'] += 2;
      w.healthcare += 1;
      break;
    case 'remote':
      w['cloud-data'] += 1;
      w['ai-software'] += 1;
      w.business += 1;
      break;
    case 'community':
      w.healthcare += 1;
      w.manufacturing += 1;
      break;
    case 'hands':
      w.manufacturing += 3;
      break;
  }

  // Q5
  switch (answers.q5) {
    case 'basic_apps':
      w['digital-literacy'] += 2;
      break;
    case 'tech_savvy':
      w['ai-software'] += 2;
      w['cloud-data'] += 1;
      break;
    case 'basics':
      w['digital-literacy'] += 3;
      break;
    case 'comfortable':
      break;
  }

  return w;
}
