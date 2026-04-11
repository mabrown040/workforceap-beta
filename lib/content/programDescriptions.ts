/**
 * 2–3 sentence program description per category for program detail pages.
 * Slug-specific overrides take priority over category-level descriptions.
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

/**
 * Slug-specific program descriptions for representative programs.
 * These override the category-level fallback when a slug match is found.
 * They answer: who it is for, how hard it is, what skills it builds,
 * what roles it leads to, and what to do next.
 */
export const PROGRAM_SLUG_DESCRIPTIONS: Record<string, string> = {
  'digital-literacy-empowerment-class':
    'This program is built for members who are new to computers, smartphones, or the internet — no prior tech experience needed. In six weeks you will build the everyday digital skills that employers expect: setting up and using email, navigating the web safely, managing online accounts, and understanding basic financial tools. Members who complete this program are ready for office support, customer service, and administrative roles. If you are already comfortable with email and basic software, Cybersecurity or IT Support may be a stronger next step. Not sure where you stand? The pathfinder quiz can help you choose.',

  'cybersecurity-professional-certificate-google':
    'This program is designed for members who are serious about entering the security field and are ready to commit three to five months of focused effort. You will build hands-on skills in Linux, SQL, Python scripting, network security, and incident response — the exact toolkit that Security Operations Center (SOC) roles require. The Google Cybersecurity Certificate is widely recognized and signals job-readiness to employers. Members who succeed here typically start as Cybersecurity Analysts, SOC Analysts, or Security Operations Specialists earning $75K–$112K. If you have never used a computer for work before, we recommend starting with Digital Literacy or IT Support first to build a foundation. Ready to move forward? Apply now or use the comparison tool to see how this program stacks up against other IT tracks.',

  'health-information-technology-mchit':
    'This program is the right fit for members drawn to healthcare administration — people who want to work in a clinical setting without a clinical role. Over three to five months you will learn medical coding (ICD-10 and CPT), electronic health records (EHR), HIPAA compliance, and revenue cycle management. These are the skills hospitals, clinics, and billing offices hire for directly. Members who complete this program move into roles as Medical Coders, Health Information Technicians, and Billing Specialists earning $52K–$72K. If you are newer to healthcare concepts, this program starts from fundamentals — no prior medical background is needed. If you are deciding between Health IT and a tech track, the pathfinder quiz or our program comparison tool can help clarify which direction fits your goals.',
};

export function getProgramDescription(category: string, slug?: string): string {
  if (slug && PROGRAM_SLUG_DESCRIPTIONS[slug]) {
    return PROGRAM_SLUG_DESCRIPTIONS[slug];
  }
  return PROGRAM_CATEGORY_DESCRIPTIONS[category] ?? 'This program prepares you for an in-demand career with industry-recognized training and certification.';
}
