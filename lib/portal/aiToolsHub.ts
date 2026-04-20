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
    id: 'career-business',
    title: 'Career & Business Coach',
    icon: 'business_center',
    description: 'General career and business coaching for project management, sales, marketing, and professional growth.',
    links: [
      { label: 'Career and Business Coach', href: '/dashboard/ai-tools/career-business-coach' },
    ],
  },
  {
    id: 'elevator-pitch',
    title: 'Elevator Pitch',
    icon: 'record_voice_over',
    description: 'AI writes your 10-20 second elevator statement — then rehearse it on camera.',
    links: [
      { label: 'Build elevator pitch', href: '/dashboard/ai-tools/elevator-pitch' },
    ],
  },
  {
    id: 'readiness',
    title: 'Career Readiness',
    icon: 'psychology',
    description: 'Talk through interviews, certifications, and next steps with an AI coach.',
    links: [
      { label: 'Career readiness coach', href: '/dashboard/ai-tools/readiness-coach' },
      { label: 'Job readiness checklist', href: '/dashboard/readiness' },
    ],
  },
  {
    id: 'resume',
    title: 'Resume',
    icon: 'description',
    description: 'Upload, analyze, rewrite, and tailor your resume.',
    links: [
      { label: 'Upload resume', href: '/dashboard/resume' },
      { label: 'Resume coach', href: '/dashboard/ai-tools/resume-coach' },
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
      { label: 'Voice job interviewer', href: '/dashboard/ai-tools/voice-interview' },
      { label: 'AI interview coach', href: '/dashboard/ai-tools/interview-coach' },
      { label: 'Interview practice worksheet', href: '/dashboard/ai-tools/interview-practice' },
    ],
  },
  {
    id: 'skill-mapping',
    title: 'Skill mapping',
    icon: 'radar',
    description: 'Map skills to occupations with O*NET data.',
    links: [
      { label: 'Skill mapper', href: '/dashboard/ai-tools/skill-mapper' },
      { label: 'Learning Hub: Find your career', href: '/dashboard/learning/find-your-career' },
    ],
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
