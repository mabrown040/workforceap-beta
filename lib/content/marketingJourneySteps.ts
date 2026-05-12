/**
 * Single source of truth for the member journey on the marketing site
 * (homepage horizontal strip and /how-it-works). Keep titles aligned with stakeholder copy.
 */
export type MarketingJourneyStep = {
  num: number;
  /** Homepage cards: which phase this milestone belongs to (Get Started → Train → Launch) */
  homePhase: 1 | 2 | 3;
  title: string;
  /** Short blurb for homepage cards */
  shortDesc: string;
  /** Longer copy for How It Works detail cards */
  longDesc: string;
  /** “Why” line on How It Works */
  why: string;
};

export const MARKETING_JOURNEY_STEPS: MarketingJourneyStep[] = [
  {
    num: 1,
    homePhase: 1,
    title: 'Apply',
    shortDesc:
      'Take about 10 minutes to apply online. We use what you share to understand your background and match you with opportunities that fit — no trick questions.',
    longDesc:
      'Fill out a short online form — no test, no gatekeeping. We use it to learn what matters to you so we can help in ways that fit your life. We follow up with your next step in 1 to 2 business days.',
    why: 'So we can personalize your path instead of sending you into a generic funnel.',
  },
  {
    num: 2,
    homePhase: 1,
    title: 'Overview & Eligibility Review',
    shortDesc:
      'Meet with a counselor to walk through programs, timelines, and eligibility together. It’s meant to help you feel informed — not tested — before you move forward.',
    longDesc:
      'Review programs, timelines, and eligibility together. This is a conversation, not an exam — we want you to feel steady and clear before you commit.',
    why: 'You deserve to know exactly what you are signing up for.',
  },
  {
    num: 3,
    homePhase: 1,
    title: 'Membership Enrollment',
    shortDesc:
      'Join at no cost to you. You’ll get your member portal, resources, and support — with no surprise fees.',
    longDesc:
      'Join at no cost to members. All members get access to resources, support, and training — without hidden fees.',
    why: 'We remove money as a barrier so you can focus on learning.',
  },
  {
    num: 4,
    homePhase: 1,
    title: 'Skills Assessment',
    shortDesc:
      'We’ll explore your strengths and growth areas together so your pathway fits you. This isn’t pass/fail — it’s how we personalize support.',
    longDesc:
      'Skills and goals evaluation so we can match you with the right career path. Not a pass/fail test — a welcoming way to shape your journey.',
    why: 'The right program for you is the one that fits your situation and goals.',
  },
  {
    num: 5,
    homePhase: 1,
    title: 'Interview',
    shortDesc:
      'A relaxed one-on-one to answer your questions and make sure this feels right for you before training begins.',
    longDesc:
      'A one-on-one to answer your questions and confirm fit. We’re making sure this is right for you — and that you feel ready for it.',
    why: 'Mutual fit matters. We succeed when you succeed.',
  },
  {
    num: 6,
    homePhase: 2,
    title: 'Resources & Workforce Readiness',
    shortDesc:
      'Build confidence with soft skills, job-search basics, and practical tools — laptops, resume help, and community support when you need it.',
    longDesc:
      'Soft skills, job search basics, and workplace expectations — plus loaner laptops, resume support, and on-demand tools. Often the part that helps people feel steady before and after training.',
    why: 'Credentials open doors; readiness and resources help you walk through them.',
  },
  {
    num: 7,
    homePhase: 2,
    title: 'Training',
    shortDesc:
      'Industry-recognized certification courses through trusted platforms — the same credentials employers hire against.',
    longDesc:
      'Industry certification courses — taught by certified instructors or approved online platforms. Real credentials employers recognize.',
    why: 'Real credentials, not certificates of attendance.',
  },
  {
    num: 8,
    homePhase: 2,
    title: 'Certificate Completion',
    shortDesc:
      'Earn credentials employers know and trust — CompTIA, AWS, Google, Microsoft, and more.',
    longDesc:
      'Earn credentials recognized by employers — CompTIA, AWS, Google, Microsoft, and more. You leave with proof employers respect.',
    why: 'Your resume needs more than “I took a class.”',
  },
  {
    num: 9,
    homePhase: 3,
    title: 'Job Readiness & Placement Assistance',
    shortDesc:
      'We stay with you through resume feedback, interview practice, employer introductions, and job-search support until you land.',
    longDesc:
      'Resume review, interview prep, employer connections, and job search support until you land. We don’t disappear after you graduate.',
    why: 'We’re invested in your first hire, not just your last exam.',
  },
  {
    num: 10,
    homePhase: 3,
    title: 'Career Opportunities & Growth',
    shortDesc:
      'Step into your role with encouragement behind you — and keep growing toward raises, promotions, and a career that lasts.',
    longDesc:
      'A career that pays. Graduates average strong starting salaries in their new field — with room to grow in the years ahead.',
    why: 'This is the outcome we’re both working toward.',
  },
];
