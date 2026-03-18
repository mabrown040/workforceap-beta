/**
 * Curated program resources per category. Used on dashboard resources page.
 */
export type ProgramResource = {
  title: string;
  description: string;
  url: string;
};

export const PROGRAM_RESOURCES: Record<string, ProgramResource[]> = {
  'ai-software': [
    { title: 'Python for Beginners', description: 'Free interactive Python tutorial', url: 'https://www.learnpython.org/' },
    { title: 'GitHub Student Pack', description: 'Free dev tools and cloud credits', url: 'https://education.github.com/pack' },
    { title: 'Google AI Essentials', description: 'Free AI fundamentals from Google', url: 'https://grow.google/certificates/ai-essentials' },
    { title: 'ChatGPT Prompt Engineering for Developers', description: 'Free short course by DeepLearning.AI', url: 'https://learn.deeplearning.ai/' },
    { title: 'Stack Overflow', description: 'Developer Q&A community', url: 'https://stackoverflow.com/' },
    { title: 'IBM SkillsBuild', description: 'Free IBM learning and career resources', url: 'https://skillsbuild.org/' },
  ],
  'it-cyber': [
    { title: 'Professor Messer Study Guides', description: 'Free CompTIA A+/Network+/Security+ prep', url: 'https://www.professormesser.com/' },
    { title: 'TryHackMe', description: 'Hands-on cybersecurity labs for beginners', url: 'https://tryhackme.com/' },
    { title: 'Cybrary', description: 'Free IT and cybersecurity courses', url: 'https://www.cybrary.it/' },
    { title: 'NIST Cybersecurity Framework', description: 'Industry standard reference guide', url: 'https://www.nist.gov/cyberframework' },
  ],
  'cloud-data': [
    { title: 'AWS Skill Builder', description: 'Free AWS training and practice exams', url: 'https://skillbuilder.aws/' },
    { title: 'Kaggle Learn', description: 'Free data science and ML micro-courses', url: 'https://www.kaggle.com/learn' },
    { title: 'Tableau Public', description: 'Free data visualization tool', url: 'https://public.tableau.com/' },
    { title: 'Google Data Analytics Resources', description: 'Program companion resources', url: 'https://grow.google/certificates/data-analytics' },
  ],
  business: [
    { title: 'Google Project Management Resources', description: 'Program companion resources', url: 'https://grow.google/certificates/project-management' },
    { title: 'Asana Academy', description: 'Free project management training', url: 'https://academy.asana.com/' },
    { title: 'Google Digital Garage', description: 'Free digital marketing courses', url: 'https://learndigital.withgoogle.com/digitalgarage' },
  ],
  healthcare: [
    { title: 'AHIMA Body of Knowledge', description: 'Health information professional resources', url: 'https://bok.ahima.org/' },
    { title: 'CMS ICD-10 Resources', description: 'Official medical coding references', url: 'https://www.cms.gov/Medicare/Coding/ICD10' },
    { title: 'MedlinePlus Medical Dictionary', description: 'Medical terminology reference', url: 'https://medlineplus.gov/' },
  ],
  manufacturing: [
    { title: 'OSHA Training Institute', description: 'Official OSHA safety training resources', url: 'https://www.osha.gov/training' },
    { title: 'Manufacturing USA', description: 'Industry resources and career pathways', url: 'https://www.manufacturingusa.com/' },
    { title: 'NIMS Credentialing', description: 'Manufacturing skills credentials', url: 'https://www.nims-skills.org/' },
  ],
  'digital-literacy': [
    { title: 'Google Digital Garage', description: 'Free digital skills training', url: 'https://learndigital.withgoogle.com/digitalgarage' },
    { title: 'GCF Global', description: 'Free tutorials on computers and the internet', url: 'https://edu.gcfglobal.org/' },
  ],
};

export function getResourcesForCategory(category: string): ProgramResource[] {
  return PROGRAM_RESOURCES[category] ?? PROGRAM_RESOURCES['ai-software'];
}
