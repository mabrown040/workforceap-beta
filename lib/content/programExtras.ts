/**
 * Decision-quality extras: best-for, job outcomes.
 * Used on cards and detail pages to help people choose confidently.
 */

export type ProgramExtra = {
  bestFor: string;
  jobOutcomes: string[];
};

export const PROGRAM_EXTRAS: Record<string, ProgramExtra> = {
  'digital-literacy-empowerment-class': {
    bestFor: 'Anyone building foundational digital skills — no tech background needed.',
    jobOutcomes: ['Office roles', 'Customer service', 'Administrative support'],
  },
  'ai-professional-developer-certificate-ibm': {
    bestFor: 'Career changers with some coding interest. Best if you can invest 4–6 months.',
    jobOutcomes: ['AI / ML Engineer', 'Software Developer', 'Applications Engineer'],
  },
  'aws-cloud-technology-amazon': {
    bestFor: 'Tech-curious learners ready for cloud. Strong demand, higher salary ceiling.',
    jobOutcomes: ['Cloud Engineer', 'Solutions Architect', 'DevOps Engineer'],
  },
  'comptia-a-professional-certificate': {
    bestFor: 'First certification in IT. Entry point to help desk, support, and networking.',
    jobOutcomes: ['IT Support Specialist', 'Help Desk Technician', 'Desktop Support'],
  },
  'comptia-network-professional-certificate': {
    bestFor: 'Building on A+ or networking interest. Next step after IT fundamentals.',
    jobOutcomes: ['Network Administrator', 'Network Technician', 'Systems Administrator'],
  },
  'comptia-security-professional-certificate': {
    bestFor: 'Moving into security. Builds on networking knowledge.',
    jobOutcomes: ['Security Analyst', 'Security Administrator', 'Compliance Analyst'],
  },
  'cybersecurity-professional-certificate-google': {
    bestFor: 'Career changers into security. No prior cyber experience required.',
    jobOutcomes: ['Cybersecurity Analyst', 'SOC Analyst', 'Security Operations'],
  },
  'data-analytics-professional-certificate-google': {
    bestFor: 'Data-minded learners. Spreadsheets to SQL to visualization.',
    jobOutcomes: ['Data Analyst', 'Business Analyst', 'Marketing Analyst'],
  },
  'data-science-professional-certificate-ibm': {
    bestFor: 'Strong interest in data + programming. Python, ML, Jupyter.',
    jobOutcomes: ['Data Scientist', 'ML Engineer', 'Analytics Engineer'],
  },
  'project-management-professional-certificate-microsoft': {
    bestFor: 'Organizers and coordinators. Agile, Scrum — transferable across industries.',
    jobOutcomes: ['Project Coordinator', 'Project Manager', 'Scrum Master'],
  },
  'digital-marketing-e-commerce-google': {
    bestFor: 'Creative, marketing-minded. SEO, analytics, e-commerce.',
    jobOutcomes: ['Digital Marketing Specialist', 'E-commerce Coordinator', 'Marketing Analyst'],
  },
  'ux-design-professional-certificate-google': {
    bestFor: 'Design-minded, user-focused. Figma, prototyping, research.',
    jobOutcomes: ['UX Designer', 'UI Designer', 'Product Designer'],
  },
  'it-support-professional-certificate-ibm': {
    bestFor: 'First IT credential. Help desk, hardware, customer support.',
    jobOutcomes: ['IT Support Specialist', 'Help Desk Technician', 'Technical Support'],
  },
  'it-automation-with-python-google': {
    bestFor: 'Automation and scripting. Builds on basic IT or Python knowledge.',
    jobOutcomes: ['IT Automation Specialist', 'DevOps Engineer', 'Systems Engineer'],
  },
  'health-information-technology-mchit': {
    bestFor: 'Healthcare administration focus. Medical coding, EHR, HIPAA.',
    jobOutcomes: ['Medical Coder', 'Health Information Technician', 'Billing Specialist'],
  },
  'production-technology-certificate-cpt': {
    bestFor: 'Hands-on learners. CNC, manufacturing, quality control.',
    jobOutcomes: ['Manufacturing Technician', 'CNC Operator', 'Quality Inspector'],
  },
  'logistics-and-supply-chain-certificate-clt': {
    bestFor: 'Supply chain, inventory, logistics. SAP and operations.',
    jobOutcomes: ['Logistics Coordinator', 'Supply Chain Analyst', 'Inventory Manager'],
  },
  'construction-readiness-certificate-osha-10': {
    bestFor: 'Construction industry entry. OSHA-10, blueprint reading, safety.',
    jobOutcomes: ['Construction Laborer', 'Apprentice', 'Site Coordinator'],
  },
  'software-developer-professional-certificate-ibm': {
    bestFor: 'Full-stack development. HTML, JavaScript, Python, React, Docker.',
    jobOutcomes: ['Software Developer', 'Full-Stack Developer', 'Web Developer'],
  },
};

export function getProgramExtra(slug: string): ProgramExtra | undefined {
  return PROGRAM_EXTRAS[slug];
}
