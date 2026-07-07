/**
 * programComparison.ts — static, pre-resolved comparison tracks for the Astro
 * marketing site. Mirrors the resolved output of
 * getProgramComparisonTracks() in lib/content/programComparisonTracks.ts.
 *
 * The source function is server-only (it imports the canonical program records,
 * programExtras, and the salary-range formatter). The values below are the
 * VERBATIM resolved results so the comparison numbers match /programs and
 * /salary-guide exactly. Do not invent numbers — update these only when the
 * canonical program records change.
 *
 *   duration  = program.duration with ", 10 hrs/week" stripped
 *   difficulty = ★ / ★★ / ★★★ from programExtras.difficulty
 *   salary     = salaryRangeDisplay(program)  ($XK–$YK)
 *   bestFor / roles = programExtras (decision-support copy)
 *
 * Covers the 14 career-track programs. Excludes Digital Literacy (on-ramp)
 * and trades programs (CPT, CLT, Core Construction) — those live on /programs.
 */

export type ComparisonTrack = {
  /** Short label for dense tables */
  shortName: string;
  slug: string;
  duration: string;
  /** Difficulty rendered as ★ stars (1–3) */
  difficulty: string;
  /** Starting range, e.g. "$55K–$72K" */
  salary: string;
  demand: 'High' | 'Very High';
  certs: string;
  bestFor: string;
  roles: string[];
  categoryLabel: string;
  categoryOrder: number;
};

export const PROGRAM_COMPARISON_TRACKS: ComparisonTrack[] = [
  // ── IT & Cybersecurity ──
  {
    shortName: 'IT Support',
    slug: 'it-support-professional-certificate-ibm',
    duration: '3-5 months',
    difficulty: '★★★',
    salary: '$55K–$72K',
    demand: 'High',
    certs: 'IBM IT Support',
    bestFor: 'First IT credential. Help desk, hardware, customer support.',
    roles: ['IT Support Specialist', 'Help Desk Technician', 'Technical Support'],
    categoryLabel: 'IT & Cybersecurity',
    categoryOrder: 1,
  },
  {
    shortName: 'CompTIA A+',
    slug: 'comptia-a-professional-certificate',
    duration: '3-5 months',
    difficulty: '★★',
    salary: '$55K–$78K',
    demand: 'High',
    certs: 'CompTIA A+ Core 1 & Core 2',
    bestFor: 'First certification in IT. Entry point to help desk, support, and networking.',
    roles: ['IT Support Specialist', 'Help Desk Technician', 'Desktop Support'],
    categoryLabel: 'IT & Cybersecurity',
    categoryOrder: 1,
  },
  {
    shortName: 'CompTIA Network+',
    slug: 'comptia-network-professional-certificate',
    duration: '3-5 months',
    difficulty: '★★',
    salary: '$60K–$88K',
    demand: 'High',
    certs: 'CompTIA Network+',
    bestFor: 'Building on A+ or networking interest. Next step after IT fundamentals.',
    roles: ['Network Administrator', 'Network Technician', 'Systems Administrator'],
    categoryLabel: 'IT & Cybersecurity',
    categoryOrder: 1,
  },
  {
    shortName: 'CompTIA Security+',
    slug: 'comptia-security-professional-certificate',
    duration: '3-5 months',
    difficulty: '★★',
    salary: '$72K–$108K',
    demand: 'Very High',
    certs: 'CompTIA Security+',
    bestFor: 'Moving into security. Builds on networking knowledge.',
    roles: ['Security Analyst', 'Security Administrator', 'Compliance Analyst'],
    categoryLabel: 'IT & Cybersecurity',
    categoryOrder: 1,
  },
  {
    shortName: 'Cybersecurity (Google)',
    slug: 'cybersecurity-professional-certificate-google',
    duration: '3-5 months',
    difficulty: '★★★',
    salary: '$75K–$112K',
    demand: 'Very High',
    certs: 'Google Cybersecurity',
    bestFor:
      'Career changers ready to enter the security field. You do not need a security background, but comfort with computers helps — members new to technology entirely should complete Digital Literacy or IT Support first.',
    roles: ['Cybersecurity Analyst', 'SOC Analyst', 'Security Operations Specialist'],
    categoryLabel: 'IT & Cybersecurity',
    categoryOrder: 1,
  },
  {
    shortName: 'IT Automation',
    slug: 'it-automation-with-python-google',
    duration: '3-5 months',
    difficulty: '★★',
    salary: '$78K–$98K',
    demand: 'High',
    certs: 'Google IT Automation',
    bestFor: 'Automation and scripting. Builds on basic IT or Python knowledge.',
    roles: ['IT Automation Specialist', 'DevOps Engineer', 'Systems Engineer'],
    categoryLabel: 'IT & Cybersecurity',
    categoryOrder: 1,
  },
  // ── Cloud & Data ──
  {
    shortName: 'Cloud (AWS)',
    slug: 'aws-cloud-technology-amazon',
    duration: '3-5 months',
    difficulty: '★★★',
    salary: '$95K–$145K',
    demand: 'Very High',
    certs: 'AWS-focused professional cert path',
    bestFor: 'Tech-curious learners ready for cloud. Strong demand, higher salary ceiling.',
    roles: ['Cloud Engineer', 'Solutions Architect', 'DevOps Engineer'],
    categoryLabel: 'Cloud & Data',
    categoryOrder: 2,
  },
  {
    shortName: 'Data Analytics',
    slug: 'data-analytics-professional-certificate-google',
    duration: '3-5 months',
    difficulty: '★★',
    salary: '$72K–$102K',
    demand: 'Very High',
    certs: 'Google Data Analytics',
    bestFor: 'Data-minded learners. Spreadsheets to SQL to visualization.',
    roles: ['Data Analyst', 'Business Analyst', 'Marketing Analyst'],
    categoryLabel: 'Cloud & Data',
    categoryOrder: 2,
  },
  {
    shortName: 'Data Science',
    slug: 'data-science-professional-certificate-ibm',
    duration: '3-5 months',
    difficulty: '★★★',
    salary: '$88K–$130K',
    demand: 'Very High',
    certs: 'IBM Data Science',
    bestFor: 'Strong interest in data + programming. Python, ML, Jupyter.',
    roles: ['Data Scientist', 'ML Engineer', 'Analytics Engineer'],
    categoryLabel: 'Cloud & Data',
    categoryOrder: 2,
  },
  // ── AI & Software Dev ──
  {
    shortName: 'AI Practitioner (AWS)',
    slug: 'ai-practitioner-professional-certificate-aws',
    duration: '3-5 months',
    difficulty: '★★★',
    salary: '$85K–$135K',
    demand: 'Very High',
    certs: 'AWS AI Practitioner',
    bestFor: 'Career changers with some coding interest. Best if you can invest 3–5 months consistently.',
    roles: ['AI / ML Engineer', 'Software Developer', 'Applications Engineer'],
    categoryLabel: 'AI & Software Dev',
    categoryOrder: 3,
  },
  {
    shortName: 'AI & Software Dev (IBM)',
    slug: 'software-developer-professional-certificate-ibm',
    duration: '3-5 months',
    difficulty: '★★★',
    salary: '$85K–$135K',
    demand: 'Very High',
    certs: 'IBM Software Developer',
    bestFor: 'Career changers ready to build software. Best if you can invest 3–5 months consistently.',
    roles: ['Software Developer', 'Full-Stack Developer', 'Web Developer'],
    categoryLabel: 'AI & Software Dev',
    categoryOrder: 3,
  },
  // ── Business ──
  {
    shortName: 'Project Management',
    slug: 'project-management-professional-certificate-microsoft',
    duration: '3-5 months',
    difficulty: '★★',
    salary: '$82K–$112K',
    demand: 'High',
    certs: 'PM foundations, Agile / Scrum',
    bestFor: 'Organizers and coordinators. Agile, Scrum — transferable across industries.',
    roles: ['Project Coordinator', 'Project Manager', 'Scrum Master'],
    categoryLabel: 'Business',
    categoryOrder: 4,
  },
  {
    shortName: 'Digital Marketing',
    slug: 'digital-marketing-e-commerce-google',
    duration: '3-5 months',
    difficulty: '★',
    salary: '$62K–$78K',
    demand: 'High',
    certs: 'Google Digital Marketing & E-Commerce',
    bestFor: 'Creative, marketing-minded. SEO, analytics, e-commerce.',
    roles: ['Digital Marketing Specialist', 'E-commerce Coordinator', 'Marketing Analyst'],
    categoryLabel: 'Business',
    categoryOrder: 4,
  },
  {
    shortName: 'UX Design',
    slug: 'ux-design-professional-certificate-google',
    duration: '3-5 months',
    difficulty: '★★',
    salary: '$88K–$120K',
    demand: 'High',
    certs: 'Google UX Design',
    bestFor: 'Design-minded, user-focused. Figma, prototyping, research.',
    roles: ['UX Designer', 'UI Designer', 'Product Designer'],
    categoryLabel: 'Business',
    categoryOrder: 4,
  },
  // ── Healthcare ──
  {
    shortName: 'Medical Billing & Health IT',
    slug: 'health-information-technology-mchit',
    duration: '3-5 months',
    difficulty: '★★',
    salary: '$52K–$72K',
    demand: 'High',
    certs: 'ICD-10 / CPT, EHR fundamentals',
    bestFor:
      'Members drawn to healthcare who want an administrative role rather than a clinical one. No prior medical background needed — this program starts from fundamentals. If your interest is more in tech than healthcare, an IT or data track may be a better path.',
    roles: ['Medical Coder', 'Health Information Technician', 'Billing Specialist'],
    categoryLabel: 'Healthcare',
    categoryOrder: 5,
  },
];

/**
 * Guided entry points — broad IT hire path, high-demand security, strong data path.
 * Mirrors STARTER_SLUGS in ProgramComparisonClient.tsx.
 */
export const STARTER_SLUGS = [
  'it-support-professional-certificate-ibm',
  'cybersecurity-professional-certificate-google',
  'data-analytics-professional-certificate-google',
] as const;
