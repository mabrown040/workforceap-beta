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
};

const TOOL_CARDS = {
  elevatorPitch: { label: 'AI Elevator Introduction', href: '/dashboard/ai-tools/elevator-pitch', icon: 'record_voice_over' },
  readinessCoach: { label: 'AI Readiness Coach', href: '/dashboard/readiness', icon: 'psychology' },
  resumeCoach: { label: 'Resume & Experience Enhancer', href: '/dashboard/ai-tools/resume-coach', icon: 'description' },
  voiceInterview: { label: 'Voice Interview Practice', href: '/dashboard/ai-tools/voice-interview', icon: 'forum' },
  careerBusiness: { label: 'Career & Business Coach', href: '/dashboard/ai-tools/career-business-coach', icon: 'business_center' },
  resumeRewriter: { label: 'Resume Rewriter', href: '/dashboard/ai-tools/resume-rewriter', icon: 'description' },
  resumeAnalysis: { label: 'Resume Analysis', href: '/dashboard/ai-tools/resume-analysis', icon: 'fact_check' },
  coverLetter: { label: 'Cover Letter', href: '/dashboard/ai-tools/cover-letter', icon: 'draft' },
  interviewPractice: { label: 'Interview Practice', href: '/dashboard/ai-tools/interview-practice', icon: 'record_voice_over' },
  interviewCoach: { label: 'Interview Coach', href: '/dashboard/ai-tools/interview-coach', icon: 'support_agent' },
  jobMatchScorer: { label: 'See how you match a job', href: '/dashboard/ai-tools/job-match-scorer', icon: 'query_stats' },
  skillMapper: { label: 'Find skills employers want', href: '/dashboard/ai-tools/skill-mapper', icon: 'account_tree' },
  linkedInHeadline: { label: 'LinkedIn Headline', href: '/dashboard/ai-tools/linkedin-headline', icon: 'badge' },
  linkedInAbout: { label: 'Write your LinkedIn story', href: '/dashboard/ai-tools/linkedin-about', icon: 'person' },
  gapAnalyzer: { label: 'See what is missing for a job', href: '/dashboard/ai-tools/gap-analyzer', icon: 'troubleshoot' },
  salaryNegotiation: { label: 'Practice asking for better pay', href: '/dashboard/ai-tools/salary-negotiation', icon: 'payments' },
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
    description: 'Talk through interviews, certifications, and next steps with an AI coach.',
    links: [
      { label: 'Open readiness coach', href: TOOL_CARDS.readinessCoach.href },
    ],
  },
  {
    id: 'resume-coach',
    title: TOOL_CARDS.resumeCoach.label,
    icon: TOOL_CARDS.resumeCoach.icon,
    description: 'Practice your story out loud and tighten your resume inside the dedicated coaching flow.',
    links: [
      { label: 'Open resume enhancer', href: TOOL_CARDS.resumeCoach.href },
    ],
  },
  {
    id: 'voice-interview',
    title: TOOL_CARDS.voiceInterview.label,
    icon: TOOL_CARDS.voiceInterview.icon,
    description: 'Practice live mock interviews with voice coaching, setup guidance, and saved results.',
    links: [
      { label: 'Open voice interviewer', href: TOOL_CARDS.voiceInterview.href },
    ],
  },
  {
    id: 'career-business',
    title: TOOL_CARDS.careerBusiness.label,
    icon: TOOL_CARDS.careerBusiness.icon,
    description: 'Get broader career, project management, sales, marketing, and business guidance in one place.',
    links: [
      { label: 'Open career and business coach', href: TOOL_CARDS.careerBusiness.href },
    ],
  },
];

export const AI_TOOLKIT_EXTRA_SECTIONS: AiToolkitSection[] = [
  {
    title: 'Step 1: Get your resume and applications ready',
    tools: [TOOL_CARDS.resumeRewriter, TOOL_CARDS.resumeAnalysis, TOOL_CARDS.coverLetter],
  },
  {
    title: 'Step 2: Pre-interview prep and role targeting',
    tools: [TOOL_CARDS.interviewPractice, TOOL_CARDS.interviewCoach, TOOL_CARDS.jobMatchScorer, TOOL_CARDS.skillMapper],
  },
  {
    title: 'Step 3: Polish your profile and job-search strategy',
    tools: [TOOL_CARDS.linkedInHeadline, TOOL_CARDS.linkedInAbout, TOOL_CARDS.gapAnalyzer, TOOL_CARDS.salaryNegotiation],
  },
];
