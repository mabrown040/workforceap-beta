import { rankProgramsForEmployerJob, __rankProgramsForEmployerJob } from './rankProgramsForEmployerJob';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const matchableText = __rankProgramsForEmployerJob.buildMatchableText(
  'Customer service teams use AWS, SQL, and help desk workflows. Training covers browser rendering and closeout checklists without mentioning those short skills explicitly.'
);

const skillCases = [
  { skill: 'AWS', expected: true },
  { skill: 'SQL', expected: true },
  { skill: 'help desk', expected: true },
  { skill: 'customer service', expected: true },
  { skill: 'R', expected: false },
  { skill: 'OS', expected: false },
] as const;

for (const { skill, expected } of skillCases) {
  const actual = __rankProgramsForEmployerJob.skillMatchesText(skill, matchableText);
  assert(actual === expected, `Expected ${skill} match to be ${expected}, got ${actual}`);
}

const employerEditRoleText = `Customer Success Manager, Mid-Market
Closinglock is hiring a Customer Success Manager to support mid-market customers through onboarding, adoption, and renewal.
Responsibilities include managing a book of business, leading quarterly business reviews, and partnering with sales and product teams.
Requirements include 3+ years in customer success, strong communication, and experience with SaaS accounts.`;

const ranked = rankProgramsForEmployerJob(employerEditRoleText, [
  'comptia-a-professional-certificate',
  'data-analytics-professional-certificate-google',
  'it-support-professional-certificate-ibm',
]);

const comptia = ranked.find((program) => program.slug === 'comptia-a-professional-certificate');
const dataAnalytics = ranked.find((program) => program.slug === 'data-analytics-professional-certificate-google');

assert(comptia, 'Expected CompTIA A+ program to be ranked');
assert(dataAnalytics, 'Expected Data Analytics program to be ranked');
assert(
  !comptia?.rationale.includes('OS'),
  `CompTIA A+ rationale should not cite OS for the customer success role: ${comptia?.rationale}`
);
assert(
  !dataAnalytics?.rationale.includes('R'),
  `Data Analytics rationale should not cite R for the customer success role: ${dataAnalytics?.rationale}`
);

console.log('rankProgramsForEmployerJob short-skill matching checks passed');
