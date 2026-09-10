/**
 * Central AI Toolkit registry for featured and secondary member-facing tools.
 */
export type AiToolsHubLink = { label: string; href: string };
export type AiToolkitToolCard = { label: string; href: string; icon: string };
export type AiToolkitSection = { title: string; tools: AiToolkitToolCard[] };

export type AiToolsHubCategory = {
  id: string;
  title: string;
  icon: string;
  description: string;
  links: AiToolsHubLink[];
  /** Optional small pill rendered next to the title (e.g. "Beta"). */
  badge?: string;
};

const TOOL_CARDS = {
  elevatorPitch: { label: 'AI Elevator Introduction', href: '/dashboard/ai-tools/elevator-pitch?prefill=true', icon: 'record_voice_over' },
  readinessCoach: { label: 'AI Readiness Coach', href: '/dashboard/readiness', icon: 'psychology' },
  resumeStudio: { label: 'Resume Studio', href: '/dashboard/ai-tools/resume-studio', icon: 'description' },
  voiceInterview: { label: 'Voice Interview Practice', href: '/dashboard/ai-tools/voice-interview', icon: 'forum' },
  careerBusiness: { label: 'Career & Business Coach', href: '/dashboard/ai-tools/career-business-coach', icon: 'business_center' },
  coverLetter: { label: 'Cover Letter', href: '/dashboard/ai-tools/cover-letter', icon: 'draft' },
  interviewPractice: { label: 'Interview Practice', href: '/dashboard/ai-tools/interview-practice?prefill=true', icon: 'record_voice_over' },
  interviewCoach: { label: 'Interview Coach', href: '/dashboard/ai-tools/interview-coach', icon: 'support_agent' },
  jobMatchScorer: { label: 'See how you match a job', href: '/dashboard/ai-tools/job-match-scorer', icon: 'query_stats' },
  // Job Tailor needs a specific job's context to run — it lives on the job
  // detail page (components/portal/JobTailorPanel.tsx), not a standalone
  // tool page. Route here to the jobs list rather than a dead direct link.
  jobTailor: { label: 'Pick a job, then tailor your resume to it', href: '/dashboard/jobs', icon: 'auto_fix_high' },
  skillMapper: { label: 'Find skills employers want', href: '/dashboard/ai-tools/skill-mapper', icon: 'account_tree' },
  trainingBridge: { label: 'Training Bridge', href: '/dashboard/ai-tools/training-bridge', icon: 'alt_route' },
  linkedInHeadline: { label: 'LinkedIn Headline', href: '/dashboard/ai-tools/linkedin-headline', icon: 'badge' },
  linkedInAbout: { label: 'Write your LinkedIn story', href: '/dashboard/ai-tools/linkedin-about', icon: 'person' },
  gapAnalyzer: { label: 'See what is missing for a job', href: '/dashboard/ai-tools/gap-analyzer', icon: 'troubleshoot' },
  salaryNegotiation: { label: 'Practice asking for better pay', href: '/dashboard/ai-tools/salary-negotiation', icon: 'payments' },
  skillCheckpoints: { label: 'Skill Checkpoints', href: '/dashboard/ai-tools/skill-checkpoints', icon: 'verified' },
  benefitsCliff: { label: 'Will this offer leave you better off?', href: '/dashboard/ai-tools/benefits-cliff', icon: 'account_balance' },
} as const satisfies Record<string, AiToolkitToolCard>;

export const AI_TOOLS_HUB: AiToolsHubCategory[] = [
  {
    id: 'elevator-pitch',
    title: TOOL_CARDS.elevatorPitch.label,
    icon: TOOL_CARDS.elevatorPitch.icon,
    description: 'Generate a sharp 10 to 20 second intro, save it, email it to yourself, then rehearse it on camera.',
    links: [
      { label: 'Open elevator introduction', href: TOOL_CARDS.elevatorPitch.href },
    ],
  },
  {
    id: 'readiness',
    title: TOOL_CARDS.readinessCoach.label,
    icon: TOOL_CARDS.readinessCoach.icon,
    description: 'Stuck on what to do next? Talk through resume, training, applications, or interviews and leave with one clear next step.',
    links: [
      { label: 'Open readiness coach', href: TOOL_CARDS.readinessCoach.href },
    ],
  },
  {
    id: 'resume-studio',
    title: TOOL_CARDS.resumeStudio.label,
    icon: TOOL_CARDS.resumeStudio.icon,
    badge: 'Beta',
    description: 'Get your resume score, fix the top issues with AI rewrites, or talk it through out loud — all in one place.',
    links: [
      { label: 'Open Resume Studio', href: TOOL_CARDS.resumeStudio.href },
    ],
  },
  {
    id: 'training-bridge',
    title: TOOL_CARDS.trainingBridge.label,
    icon: TOOL_CARDS.trainingBridge.icon,
    badge: 'Beta',
    description: 'See which skills you still need for the job you want, and which no-cost training pathway covers them.',
    links: [
      { label: 'Open Training Bridge', href: TOOL_CARDS.trainingBridge.href },
    ],
  },
  {
    id: 'benefits-cliff',
    title: TOOL_CARDS.benefitsCliff.label,
    icon: TOOL_CARDS.benefitsCliff.icon,
    badge: 'Beta',
    description: 'Check how a job offer could change your SNAP, Medicaid, or TANF benefits before you say yes. An estimate, not benefits advice.',
    links: [
      { label: 'Open Benefits Check', href: TOOL_CARDS.benefitsCliff.href },
    ],
  },
  {
    id: 'voice-interview',
    title: TOOL_CARDS.voiceInterview.label,
    icon: TOOL_CARDS.voiceInterview.icon,
    description: 'A realistic interviewer for the role you name: answer out loud, then review your transcript, feedback, and saved results.',
    links: [
      { label: 'Open voice interviewer', href: TOOL_CARDS.voiceInterview.href },
    ],
  },
  {
    id: 'career-business',
    title: TOOL_CARDS.careerBusiness.label,
    icon: TOOL_CARDS.careerBusiness.icon,
    description: 'Lilley in a wider lane: project management, sales, marketing, communication, and business questions beyond your program.',
    links: [
      { label: 'Open career and business coach', href: TOOL_CARDS.careerBusiness.href },
    ],
  },
];

export const AI_TOOLKIT_EXTRA_SECTIONS: AiToolkitSection[] = [
  {
    title: 'Step 1: Get your resume and applications ready',
    tools: [TOOL_CARDS.resumeStudio, TOOL_CARDS.coverLetter, TOOL_CARDS.skillCheckpoints],
  },
  {
    title: 'Step 2: Pre-interview prep and role targeting',
    tools: [TOOL_CARDS.interviewPractice, TOOL_CARDS.interviewCoach, TOOL_CARDS.jobMatchScorer, TOOL_CARDS.jobTailor, TOOL_CARDS.skillMapper, TOOL_CARDS.trainingBridge],
  },
  {
    title: 'Step 3: Polish your profile and job-search strategy',
    tools: [TOOL_CARDS.linkedInHeadline, TOOL_CARDS.linkedInAbout, TOOL_CARDS.gapAnalyzer, TOOL_CARDS.salaryNegotiation, TOOL_CARDS.benefitsCliff],
  },
];
