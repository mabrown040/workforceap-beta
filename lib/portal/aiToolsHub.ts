/**
 * Simplified AI Career Toolkit hub: eight top-level categories, each linking to existing tools.
 */
export type AiToolsHubLink = { label: string; href: string };

export type AiToolsHubCategory = {
  id: string;
  title: string;
  icon: string;
  description: string;
  links: AiToolsHubLink[];
};

export const AI_TOOLS_HUB: AiToolsHubCategory[] = [
  {
    id: 'resume',
    title: 'Resume',
    icon: 'description',
    description: 'Upload, analyze, rewrite, and tailor your resume.',
    links: [
      { label: 'Upload resume', href: '/dashboard/resume' },
      { label: 'Resume AI analysis', href: '/dashboard/ai-tools/resume-analysis' },
      { label: 'AI resume rewriter', href: '/dashboard/ai-tools/resume-rewriter' },
      { label: 'AI cover letter', href: '/dashboard/ai-tools/cover-letter' },
    ],
  },
  {
    id: 'interview',
    title: 'Interview',
    icon: 'forum',
    description: 'Practice questions and live voice mock interviews.',
    links: [
      { label: 'AI interview coach', href: '/dashboard/ai-tools/interview-coach' },
      { label: 'Interview practice worksheet', href: '/dashboard/ai-tools/interview-practice' },
    ],
  },
  {
    id: 'skill-mapping',
    title: 'Skill mapping',
    icon: 'radar',
    description: 'Map skills to occupations with O*NET data.',
    links: [{ label: 'Skill mapper', href: '/dashboard/ai-tools/skill-mapper' }],
  },
  {
    id: 'linkedin',
    title: 'LinkedIn',
    icon: 'work',
    description: 'Headline and About from your experience.',
    links: [
      { label: 'LinkedIn headline', href: '/dashboard/ai-tools/linkedin-headline' },
      { label: 'LinkedIn About (from resume)', href: '/dashboard/ai-tools/linkedin-about' },
    ],
  },
  {
    id: 'career-gap',
    title: 'Career gap',
    icon: 'history',
    description: 'Frame employment gaps with suggested language.',
    links: [{ label: 'Gap analyzer', href: '/dashboard/ai-tools/gap-analyzer' }],
  },
  {
    id: 'job-match',
    title: 'Job match',
    icon: 'target',
    description: 'Score your fit against a job posting.',
    links: [{ label: 'Job match scorer', href: '/dashboard/ai-tools/job-match-scorer' }],
  },
  {
    id: 'applications',
    title: 'Application tracker',
    icon: 'view_list',
    description: 'Track applications and status in one place.',
    links: [{ label: 'Application tracker', href: '/dashboard/job-applications' }],
  },
  {
    id: 'salary',
    title: 'Salary negotiator',
    icon: 'payments',
    description: 'Scripts and framing for offer conversations.',
    links: [{ label: 'Salary negotiator', href: '/dashboard/ai-tools/salary-negotiation' }],
  },
];
