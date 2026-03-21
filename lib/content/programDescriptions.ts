/**
 * 2–3 sentence program description per category for program detail pages.
 */
export const PROGRAM_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'it-cyber':
    'Prepare for a career in IT support, networking, or cybersecurity with hands-on training and an industry-recognized certification. Our programs cover hardware, software, and security fundamentals employers look for.',
  'ai-software':
    'Learn the tools, languages, and frameworks powering today\'s AI-driven software industry. From Python and machine learning to full-stack development, these programs prepare you for in-demand tech roles.',
  'cloud-data':
    'Build skills in cloud architecture, data analytics, and DevOps. These programs connect you with certifications from Google, IBM, and Amazon that employers hire against.',
  'business':
    'Develop project management, digital marketing, and UX design skills. These credentials transfer across industries and open doors to roles in tech, healthcare, and beyond.',
  'healthcare':
    'Prepare for medical coding and health information roles. Learn EHR systems, HIPAA compliance, and coding fundamentals employers use in healthcare administration.',
  'manufacturing':
    'Gain hands-on skills in production technology, logistics, and construction readiness. These certifications prepare you for roles in advanced manufacturing and skilled trades.',
  'digital-literacy':
    'Build foundational digital skills for work and life. From email and online safety to financial literacy, this program prepares you for today\'s connected workplace.',
};

export function getProgramDescription(category: string): string {
  return PROGRAM_CATEGORY_DESCRIPTIONS[category] ?? 'This program prepares you for an in-demand career with industry-recognized training and certification.';
}
