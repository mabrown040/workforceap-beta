/**
 * Single source of truth for the 10-step member journey on the marketing site
 * (homepage horizontal strip and /how-it-works). Keep titles aligned with stakeholder copy.
 */
export type MarketingJourneyStep = {
  num: number;
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
    title: 'Apply',
    shortDesc:
      'Submit your application online in about 10 minutes. We use it to understand your background and match you with the right opportunity.',
    longDesc:
      'Fill out a short online form — no test, no gatekeeping. We use it to understand your goals so we can help you. We follow up with your next step in 1 to 2 business days.',
    why: 'So we can personalize your path instead of sending you into a generic funnel.',
  },
  {
    num: 2,
    title: 'Overview & Eligibility Review',
    shortDesc:
      'Meet with a counselor to review programs, timelines, and eligibility. Know what to expect before you commit.',
    longDesc:
      'Review programs, timelines, and eligibility together. This is a conversation, not an exam — we want you to feel confident before you commit.',
    why: 'You deserve to know exactly what you are signing up for.',
  },
  {
    num: 3,
    title: 'Membership Enrollment',
    shortDesc:
      'Join at no cost to members. Get access to your member portal, resources, and support — no hidden fees.',
    longDesc:
      'Join at no cost to members. All members get access to resources, support, and training. No hidden fees.',
    why: 'We remove money as a barrier so you can focus on learning.',
  },
  {
    num: 4,
    title: 'Skills Assessment',
    shortDesc:
      'Discover your strengths and growth areas so we can personalize your pathway — not a pass/fail test.',
    longDesc:
      'Skills and goals evaluation so we can match you with the right career path. Not a pass/fail test — a way to personalize your journey.',
    why: 'The right program for you is the one that fits your situation and goals.',
  },
  {
    num: 5,
    title: 'Interview',
    shortDesc:
      'A one-on-one conversation to answer your questions and confirm mutual fit before you dive into training.',
    longDesc:
      'A one-on-one to answer your questions and confirm fit. We are making sure this is right for you — and that you are ready for it.',
    why: 'Mutual fit matters. We succeed when you succeed.',
  },
  {
    num: 6,
    title: 'Resources & Workforce Readiness',
    shortDesc:
      'Soft skills, job search basics, and the tools you need — laptops, resume help, and community support.',
    longDesc:
      'Soft skills, job search basics, and workplace expectations — plus loaner laptops, resume support, and on-demand tools. Often the part that gets people hired.',
    why: 'Credentials open doors; readiness and resources get you through them.',
  },
  {
    num: 7,
    title: 'Training',
    shortDesc:
      'Industry certification courses from approved platforms — the same credentials employers hire against.',
    longDesc:
      'Industry certification courses — taught by certified instructors or approved online platforms. The same credentials employers hire against.',
    why: 'Real credentials, not certificates of attendance.',
  },
  {
    num: 8,
    title: 'Certificate Completion',
    shortDesc:
      'Earn credentials employers recognize — CompTIA, AWS, Google, Microsoft, and more.',
    longDesc:
      'Earn credentials recognized by employers — CompTIA, AWS, Google, Microsoft, and more. You walk away with proof employers trust.',
    why: 'Your resume needs more than “I took a class.”',
  },
  {
    num: 9,
    title: 'Job Readiness & Placement Assistance',
    shortDesc:
      'Resume review, interview prep, employer connections, and job search support until you land.',
    longDesc:
      'Resume review, interview prep, employer connections, and job search support until you land. We do not disappear after you graduate.',
    why: 'We are invested in your first hire, not just your last exam.',
  },
  {
    num: 10,
    title: 'Career Opportunities & Growth',
    shortDesc:
      'Land your role with ongoing support — and build toward raises, promotions, and long-term career growth.',
    longDesc:
      'A career that pays. Graduates average strong starting salaries in their new field — with room to grow in the years ahead.',
    why: 'This is the outcome we are both working toward.',
  },
];
