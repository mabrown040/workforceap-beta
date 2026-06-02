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

const customerSuccessRoleText = `Customer Success Manager, Mid-Market
Closinglock is hiring a Customer Success Manager to support mid-market customers through onboarding, adoption, and renewal.
Responsibilities include managing a book of business, leading quarterly business reviews, and partnering with sales and product teams.
Requirements include 3+ years in customer success, strong communication, and experience with SaaS accounts.`;

const customerSuccessRanked = rankProgramsForEmployerJob(customerSuccessRoleText, [
  'comptia-a-professional-certificate',
  'data-analytics-professional-certificate-google',
  'it-support-professional-certificate-ibm',
]);

const comptia = customerSuccessRanked.find((program) => program.slug === 'comptia-a-professional-certificate');
const dataAnalytics = customerSuccessRanked.find((program) => program.slug === 'data-analytics-professional-certificate-google');

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

const proseOnlyMatchableText = __rankProgramsForEmployerJob.buildMatchableText(
  'Our team values clear writing, thoughtful research, and careful review of customer narratives.'
);
assert(
  !__rankProgramsForEmployerJob.skillMatchesText('R', proseOnlyMatchableText),
  'Plain prose should not trigger the R skill match'
);

const awsRoleText = `Cloud Operations Engineer
Build and maintain AWS workloads, automate deployments, and improve cloud reliability.`;
const awsRanked = rankProgramsForEmployerJob(awsRoleText, [
  'aws-cloud-technology-amazon',
  'comptia-a-professional-certificate',
]);
const awsProgram = awsRanked.find((program) => program.slug === 'aws-cloud-technology-amazon');
assert(awsProgram?.score && awsProgram.score >= 3, `AWS program should score strongly for explicit AWS roles, got ${awsProgram?.score}`);
assert(
  awsProgram?.rationale.includes('AWS') || awsProgram?.rationale.includes('Cloud'),
  `AWS rationale should reflect the explicit cloud match: ${awsProgram?.rationale}`
);

console.log('rankProgramsForEmployerJob short-skill matching checks passed');
