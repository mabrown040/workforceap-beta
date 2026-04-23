/**
 * Simplified AI Career Toolkit hub: the 5 member-facing tools we want surfaced clearly for go-live.
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
    id: 'elevator-pitch',
    title: 'AI Elevator Speech',
    icon: 'record_voice_over',
    description: 'Generate a sharp 10 to 20 second intro, save it, email it to yourself, then rehearse it on camera.',
    links: [
      { label: 'Open AI elevator speech', href: '/dashboard/ai-tools/elevator-pitch' },
    ],
  },
  {
    id: 'readiness',
    title: 'Career Readiness Coach',
    icon: 'psychology',
    description: 'Talk through interviews, certifications, and next steps with an AI coach.',
    links: [
      { label: 'Open readiness coach', href: '/dashboard/ai-tools/readiness-coach' },
    ],
  },
  {
    id: 'resume-coach',
    title: 'Resume Coach',
    icon: 'description',
    description: 'Practice your story out loud and tighten your resume inside the dedicated coaching flow.',
    links: [
      { label: 'Open resume coach', href: '/dashboard/ai-tools/resume-coach' },
    ],
  },
  {
    id: 'voice-interview',
    title: 'Voice Interview',
    icon: 'forum',
    description: 'Practice live mock interviews with voice coaching, setup guidance, and saved results.',
    links: [
      { label: 'Start voice interview', href: '/dashboard/ai-tools/voice-interview' },
    ],
  },
  {
    id: 'career-business',
    title: 'Career & Business Coach',
    icon: 'business_center',
    description: 'Get broader career, project management, sales, marketing, and business guidance in one place.',
    links: [
      { label: 'Open career and business coach', href: '/dashboard/ai-tools/career-business-coach' },
    ],
  },
];
