/**
 * Find Your Path quiz — questions, answers, and scoring logic.
 */

export type CategoryKey =
  | 'IT & Cybersecurity'
  | 'AI & Software Dev'
  | 'Cloud & Data'
  | 'Business'
  | 'Healthcare'
  | 'Manufacturing'
  | 'Digital Literacy';

export const CATEGORY_WEIGHTS: Record<CategoryKey, number> = {
  'IT & Cybersecurity': 0,
  'AI & Software Dev': 0,
  'Cloud & Data': 0,
  Business: 0,
  Healthcare: 0,
  Manufacturing: 0,
  'Digital Literacy': 0,
};

/** Maps program category slug to quiz category key */
export const PROGRAM_TO_QUIZ_CATEGORY: Record<string, CategoryKey> = {
  'it-cyber': 'IT & Cybersecurity',
  'ai-software': 'AI & Software Dev',
  'cloud-data': 'Cloud & Data',
  business: 'Business',
  healthcare: 'Healthcare',
  manufacturing: 'Manufacturing',
  'digital-literacy': 'Digital Literacy',
};

export type Q1Answer =
  | 'computers and technology'
  | 'health'
  | 'building with hands'
  | 'managing projects'
  | 'data and numbers'
  | 'not sure';

export type Q2Answer =
  | 'brand new'
  | 'some knowledge'
  | 'work experience'
  | 'certifications';

export type Q3Answer =
  | 'as fast as possible'
  | '3-5 months'
  | 'planning ahead'
  | 'currently employed';

export type Q4Answer =
  | 'highest salary'
  | 'stability'
  | 'remote'
  | 'community'
  | 'hands';

export type Q5Answer =
  | 'comfortable'
  | 'basic apps'
  | 'very tech-savvy'
  | 'start from basics';

export type QuizAnswers = {
  q1: Q1Answer;
  q2: Q2Answer;
  q3: Q3Answer;
  q4: Q4Answer;
  q5: Q5Answer;
};

export const QUESTIONS = [
  {
    id: 1,
    question: "What interests you most?",
    answers: [
      { value: 'computers and technology' as const, label: 'Working with computers and technology' },
      { value: 'health' as const, label: 'Helping people with their health' },
      { value: 'building with hands' as const, label: 'Building and making things with your hands' },
      { value: 'managing projects' as const, label: 'Managing projects and teams' },
      { value: 'data and numbers' as const, label: 'Working with data and numbers' },
      { value: 'not sure' as const, label: "I'm not sure yet — show me everything" },
    ],
  },
  {
    id: 2,
    question: "What's your experience level?",
    answers: [
      { value: 'brand new' as const, label: "I'm brand new — no experience in this field" },
      { value: 'some knowledge' as const, label: 'I have some basic knowledge but no credentials' },
      { value: 'work experience' as const, label: 'I have work experience but no formal certification' },
      { value: 'certifications' as const, label: 'I have certifications but want to level up' },
    ],
  },
  {
    id: 3,
    question: 'How quickly do you want to start working?',
    answers: [
      { value: 'as fast as possible' as const, label: 'As fast as possible — I need a job soon' },
      { value: '3-5 months' as const, label: 'I can invest 3–5 months in training' },
      { value: 'planning ahead' as const, label: "I'm planning ahead — no rush" },
      { value: 'currently employed' as const, label: "I'm currently employed but want to switch careers" },
    ],
  },
  {
    id: 4,
    question: 'What matters most to you in a career?',
    answers: [
      { value: 'highest salary' as const, label: 'Highest salary potential' },
      { value: 'stability' as const, label: 'Job stability and demand' },
      { value: 'remote' as const, label: 'Working remotely or from home' },
      { value: 'community' as const, label: 'Making a difference in my community' },
      { value: 'hands' as const, label: 'Working with my hands, not just a screen' },
    ],
  },
  {
    id: 5,
    question: "What's your comfort level with technology?",
    answers: [
      { value: 'comfortable' as const, label: 'I\'m comfortable with computers, email, and the internet' },
      { value: 'basic apps' as const, label: 'I can use a phone and basic apps but computers are tricky' },
      { value: 'very tech-savvy' as const, label: "I'm very tech-savvy — I just need the credential" },
      { value: 'start from basics' as const, label: 'I need to start from the basics' },
    ],
  },
];

export function computeScores(answers: QuizAnswers): Record<CategoryKey, number> {
  const scores = { ...CATEGORY_WEIGHTS };

  // Q1
  switch (answers.q1) {
    case 'computers and technology':
      scores['IT & Cybersecurity'] += 3;
      scores['AI & Software Dev'] += 2;
      break;
    case 'health':
      scores['Healthcare'] += 4;
      break;
    case 'building with hands':
      scores['Manufacturing'] += 4;
      break;
    case 'managing projects':
      scores['Business'] += 3;
      break;
    case 'data and numbers':
      scores['Cloud & Data'] += 3;
      scores['AI & Software Dev'] += 2;
      break;
    case 'not sure':
      (Object.keys(scores) as CategoryKey[]).forEach((k) => (scores[k] += 1));
      break;
  }

  // Q2
  switch (answers.q2) {
    case 'brand new':
      scores['Digital Literacy'] += 2;
      break;
    case 'some knowledge':
      scores['IT & Cybersecurity'] += 1;
      scores['Business'] += 1;
      scores['Cloud & Data'] += 1;
      break;
    case 'work experience':
      scores['AI & Software Dev'] += 1;
      scores['Cloud & Data'] += 1;
      scores['Healthcare'] += 1;
      break;
    case 'certifications':
      scores['AI & Software Dev'] += 2;
      scores['Cloud & Data'] += 2;
      scores['IT & Cybersecurity'] += 2;
      break;
  }

  // Q3
  switch (answers.q3) {
    case 'as fast as possible':
      scores['Digital Literacy'] += 2;
      scores['IT & Cybersecurity'] += 1; // CompTIA A+ is shorter
      break;
    case '3-5 months':
      scores['IT & Cybersecurity'] += 1;
      scores['Business'] += 1;
      scores['Cloud & Data'] += 1;
      break;
    case 'planning ahead':
      scores['AI & Software Dev'] += 1;
      scores['Healthcare'] += 1;
      scores['Manufacturing'] += 1;
      break;
    case 'currently employed':
      scores['Business'] += 1;
      scores['Cloud & Data'] += 1;
      break;
  }

  // Q4
  switch (answers.q4) {
    case 'highest salary':
      scores['Cloud & Data'] += 2;
      scores['AI & Software Dev'] += 2;
      break;
    case 'stability':
      scores['IT & Cybersecurity'] += 2;
      scores['Healthcare'] += 1;
      break;
    case 'remote':
      scores['Cloud & Data'] += 1;
      scores['AI & Software Dev'] += 1;
      scores['Business'] += 1;
      break;
    case 'community':
      scores['Healthcare'] += 1;
      scores['Manufacturing'] += 1;
      break;
    case 'hands':
      scores['Manufacturing'] += 3;
      break;
  }

  // Q5
  switch (answers.q5) {
    case 'comfortable':
      break;
    case 'basic apps':
      scores['Digital Literacy'] += 2;
      break;
    case 'very tech-savvy':
      scores['AI & Software Dev'] += 2;
      scores['Cloud & Data'] += 1;
      break;
    case 'start from basics':
      scores['Digital Literacy'] += 3;
      break;
  }

  return scores;
}

/** Parse salary string to numeric value for sorting (e.g. "$38K-$52K" -> 38000) */
export function parseSalaryNum(salary: string): number {
  const match = salary.match(/\$(\d+)K/i) || salary.match(/\$(\d+)/);
  if (match) return parseInt(match[1], 10) * (salary.toUpperCase().includes('K') ? 1000 : 1);
  return 0;
}
