'use client';

import { useLocale } from './LocaleContext';

/**
 * Map common English nav labels to translation keys.
 * If no mapping exists, returns the original label.
 */
const LABEL_TO_KEY: Record<string, string> = {
  // Member portal nav
  'Home': 'nav.dashboard',
  'My Program': 'nav.myProgram',
  'My Classes': 'nav.training',
  'My Certificates': 'nav.myCertificates',
  'My Career Plan': 'nav.careerPlan',
  'WIOA Qualification': 'nav.wioaQualification',
  'Job Board': 'nav.jobBoard',
  'Job Applications': 'nav.jobApplications',
  'Resume': 'nav.resume',
  'My Progress': 'nav.myProgress',
  'Career Toolkit': 'nav.careerToolkit',
  'AI Counselor': 'nav.aiCounselor',
  'Learning Hub': 'nav.learningHub',
  'Find your career': 'nav.findYourCareer',
  'Training Preassessment': 'nav.trainingPreassessment',
  'Weekly Recap': 'nav.weeklyRecap',
  'Counselor Chat': 'nav.counselorChat',
  'Resources': 'nav.resources',
  'Help & Support': 'nav.help',
  'Member Guide': 'nav.memberGuide',
  'Profile & Account': 'nav.myAccount',

  // Group labels
  'Workflows': 'group.workflows',
  'Insights': 'group.insights',
  'Manage': 'group.manage',

  // Tab labels
  'Jobs': 'tab.jobs',

  // Workspace labels
  'WorkforceAP site': 'workspace.publicSite',
  'Member portal': 'workspace.member',
  'Employer portal': 'workspace.employer',
  'Partner portal': 'workspace.partner',
  'Counselor portal': 'workspace.counselor',
  'Admin workspace': 'workspace.admin',

  // Marketing nav
  'Programs': 'nav.programs',
  'Check Eligibility': 'nav.checkEligibility',
  'Find Your Path': 'nav.findYourPath',
  'Partners': 'nav.partners',
  'Employers': 'nav.employers',
  'Blog': 'nav.blog',
  'Contact Us': 'nav.contactUs',
  'Apply Now': 'cta.applyNow',
  'Login': 'cta.logIn',
  'About Us': 'nav.aboutUs',
  'What We Do': 'nav.whatWeDo',
  'How It Works': 'nav.howItWorks',
  'Leadership': 'nav.leadership',
  'FAQ': 'nav.faq',
  'Counselor sign in': 'cta.logIn',
  'Partner sign in': 'cta.logIn',
  'Employer sign in': 'cta.logIn',
  'Member sign in': 'cta.logIn',
  'Member dashboard': 'nav.dashboard',
  'Account settings': 'nav.myAccount',

  // Footer / common
  'Sign out': 'nav.signOut',
};

export function useTranslatedLabel() {
  const { t } = useLocale();
  return (label: string) => {
    const key = LABEL_TO_KEY[label];
    return key ? t(key, label) : label;
  };
}
