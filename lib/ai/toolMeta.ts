export type ToolSlug =
  | 'resume-rewriter'
  | 'job-match-scorer'
  | 'cover-letter'
  | 'interview-practice'
  | 'linkedin-headline'
  | 'linkedin-about'
  | 'salary-negotiation'
  | 'gap-analyzer'
  | 'application-tracker';

export type ToolType =
  | 'resume_rewriter'
  | 'job_match_scorer'
  | 'cover_letter'
  | 'interview_practice'
  | 'linkedin_headline'
  | 'linkedin_about'
  | 'salary_negotiation'
  | 'gap_analyzer';

export type ToolJob =
  | 'improve-resume'
  | 'tailor-materials'
  | 'prepare-interviews'
  | 'evaluate-fit'
  | 'strengthen-linkedin'
  | 'manage-applications'
  | 'negotiate-offer';

export type ToolMeta = {
  slug: ToolSlug;
  toolType?: ToolType;
  title: string;
  description: string;
  timeToComplete: string;
  href: string;
  status: 'available' | 'coming_soon';
  job: ToolJob;
  sequence: number;
  shortExpectations: string;
  inputHelp: string;
  outputUse: string;
  nextSteps: ToolSlug[];
};

export type ToolJobGroup = {
  id: ToolJob;
  title: string;
  description: string;
  sequenceLabel: string;
  toolSlugs: ToolSlug[];
};

export const TOOL_JOBS: ToolJobGroup[] = [
  {
    id: 'improve-resume',
    title: 'Improve your resume',
    description: 'Start by clarifying your positioning, strengthening your language, and addressing issues that might weaken your application.',
    sequenceLabel: 'Step 1',
    toolSlugs: ['resume-rewriter', 'gap-analyzer'],
  },
  {
    id: 'evaluate-fit',
    title: 'Evaluate a job fit',
    description: 'Compare your current materials to a job posting so you know whether to apply as-is or what to fix first.',
    sequenceLabel: 'Step 2',
    toolSlugs: ['job-match-scorer'],
  },
  {
    id: 'tailor-materials',
    title: 'Tailor application materials',
    description: 'Adapt your application package for a specific role, then carry that version into your applications.',
    sequenceLabel: 'Step 3',
    toolSlugs: ['cover-letter'],
  },
  {
    id: 'strengthen-linkedin',
    title: 'Strengthen LinkedIn presence',
    description: 'Keep your public profile aligned with the same positioning you use in applications.',
    sequenceLabel: 'Step 4',
    toolSlugs: ['linkedin-headline', 'linkedin-about'],
  },
  {
    id: 'manage-applications',
    title: 'Track and organize applications',
    description: 'Use the tracker so tailored materials and next steps stay connected to real opportunities.',
    sequenceLabel: 'Step 5',
    toolSlugs: ['application-tracker'],
  },
  {
    id: 'prepare-interviews',
    title: 'Prepare for interviews',
    description: 'Once you have a role target, practice likely questions and create talking points you can reuse in interviews.',
    sequenceLabel: 'Step 6',
    toolSlugs: ['interview-practice'],
  },
  {
    id: 'negotiate-offer',
    title: 'Negotiate your offer',
    description: 'Use this after interviews, when you have an offer in hand and want a script you can use right away.',
    sequenceLabel: 'Step 7',
    toolSlugs: ['salary-negotiation'],
  },
];

export const TOOL_METADATA: ToolMeta[] = [
  {
    slug: 'resume-rewriter',
    toolType: 'resume_rewriter',
    title: 'Resume Rewriter',
    description: 'Reposition your existing resume toward a target role without inventing anything.',
    timeToComplete: '5–10 min',
    href: '/dashboard/ai-tools/resume-rewriter',
    status: 'available',
    job: 'improve-resume',
    sequence: 1,
    shortExpectations: 'Best for your first pass when you know the kind of job you want but need stronger wording and positioning.',
    inputHelp: 'Bring your current resume, target role, and optional salary/location context.',
    outputUse: 'Use the rewritten resume as your working draft before checking job match or writing a cover letter.',
    nextSteps: ['job-match-scorer', 'cover-letter'],
  },
  {
    slug: 'gap-analyzer',
    toolType: 'gap_analyzer',
    title: 'Resume Gap Analyzer',
    description: 'Detect employment gaps and get language to explain them professionally.',
    timeToComplete: '3–5 min',
    href: '/dashboard/ai-tools/gap-analyzer',
    status: 'available',
    job: 'improve-resume',
    sequence: 2,
    shortExpectations: 'Helpful if you are worried about breaks in employment or want stronger interview framing before you apply.',
    inputHelp: 'Paste or upload the resume you plan to use.',
    outputUse: 'Reuse the framing language in cover letters, interviews, and applications.',
    nextSteps: ['job-match-scorer', 'interview-practice'],
  },
  {
    slug: 'job-match-scorer',
    toolType: 'job_match_scorer',
    title: 'Job Match Scorer',
    description: 'Compare your resume to a specific posting to see strengths, gaps, and quick wins.',
    timeToComplete: '3–5 min',
    href: '/dashboard/ai-tools/job-match-scorer',
    status: 'available',
    job: 'evaluate-fit',
    sequence: 3,
    shortExpectations: 'Use this after your resume is in decent shape and you are deciding how competitive you are for a specific role.',
    inputHelp: 'Bring a full job description and the resume version you would submit today.',
    outputUse: 'Apply the quick wins, then move directly into a tailored cover letter or interview prep.',
    nextSteps: ['cover-letter', 'interview-practice'],
  },
  {
    slug: 'cover-letter',
    toolType: 'cover_letter',
    title: 'Cover Letter Builder',
    description: 'Turn your resume and a job posting into a targeted draft you can personalize.',
    timeToComplete: '5–10 min',
    href: '/dashboard/ai-tools/cover-letter',
    status: 'available',
    job: 'tailor-materials',
    sequence: 4,
    shortExpectations: 'Best once you have chosen a job and know the angle you want to emphasize.',
    inputHelp: 'Bring the job description, company name, your resume, and your preferred tone.',
    outputUse: 'Edit the draft so it sounds like you, then save it with the application you submit.',
    nextSteps: ['application-tracker', 'interview-practice'],
  },
  {
    slug: 'linkedin-headline',
    toolType: 'linkedin_headline',
    title: 'LinkedIn Headline Generator',
    description: 'Generate short headline options that reflect the role you want and the strengths you want noticed.',
    timeToComplete: '2–3 min',
    href: '/dashboard/ai-tools/linkedin-headline',
    status: 'available',
    job: 'strengthen-linkedin',
    sequence: 5,
    shortExpectations: 'Use this when your LinkedIn profile needs to match the same story as your resume and applications.',
    inputHelp: 'Bring your target role, strongest skills, and optional years of experience.',
    outputUse: 'Pick one version, personalize it, and keep it aligned with your resume positioning.',
    nextSteps: ['linkedin-about', 'application-tracker'],
  },
  {
    slug: 'linkedin-about',
    toolType: 'linkedin_about',
    title: 'LinkedIn About Generator',
    description: 'Draft a stronger About section from a few role and experience bullets.',
    timeToComplete: '3–5 min',
    href: '/dashboard/ai-tools/linkedin-about',
    status: 'available',
    job: 'strengthen-linkedin',
    sequence: 6,
    shortExpectations: 'Useful after you tighten your headline so your profile tells a consistent story from top to bottom.',
    inputHelp: 'Bring the role you want and a few concrete bullets about your background.',
    outputUse: 'Refine the language to sound natural, then paste it into LinkedIn as a profile draft.',
    nextSteps: ['application-tracker'],
  },
  {
    slug: 'application-tracker',
    title: 'Application Tracker',
    description: 'Keep your applications, statuses, and follow-up work in one place.',
    timeToComplete: 'Ongoing',
    href: '/dashboard/ai-tools/application-tracker',
    status: 'available',
    job: 'manage-applications',
    sequence: 7,
    shortExpectations: 'Use this throughout the process so your AI outputs connect to real applications instead of disappearing after one session.',
    inputHelp: 'Bring the jobs you are applying to and log status changes as you move forward.',
    outputUse: 'Track what you submitted, what needs follow-up, and which jobs deserve more tailoring.',
    nextSteps: ['interview-practice'],
  },
  {
    slug: 'interview-practice',
    toolType: 'interview_practice',
    title: 'Interview Practice Generator',
    description: 'Generate likely interview questions, tips, and example answers for your target role.',
    timeToComplete: '10–15 min',
    href: '/dashboard/ai-tools/interview-practice',
    status: 'available',
    job: 'prepare-interviews',
    sequence: 8,
    shortExpectations: 'Use this after you know the role you are applying for so the questions are specific enough to practice with.',
    inputHelp: 'Bring the title of the role and your experience level.',
    outputUse: 'Turn the strongest questions into a practice set, then adapt the sample answers with your own real stories.',
    nextSteps: ['salary-negotiation'],
  },
  {
    slug: 'salary-negotiation',
    toolType: 'salary_negotiation',
    title: 'Salary Negotiation Script',
    description: 'Get a structured phone or email script once you have an offer to respond to.',
    timeToComplete: '2–3 min',
    href: '/dashboard/ai-tools/salary-negotiation',
    status: 'available',
    job: 'negotiate-offer',
    sequence: 9,
    shortExpectations: 'This is the final-stage tool for when you have numbers in hand and want language you can actually use.',
    inputHelp: 'Bring your current offer, target number, role, company, and whether you are replying by phone or email.',
    outputUse: 'Customize the script so it matches your voice and the relationship you have with the employer.',
    nextSteps: ['application-tracker'],
  },
];

export const TOOL_METADATA_BY_SLUG = Object.fromEntries(TOOL_METADATA.map((tool) => [tool.slug, tool])) as Record<ToolSlug, ToolMeta>;
export const TOOL_METADATA_BY_TYPE = Object.fromEntries(
  TOOL_METADATA.filter((tool): tool is ToolMeta & { toolType: ToolType } => Boolean(tool.toolType)).map((tool) => [tool.toolType, tool])
) as Record<ToolType, ToolMeta>;

export function getToolLabel(toolType: string) {
  return TOOL_METADATA_BY_TYPE[toolType as ToolType]?.title ?? toolType;
}
