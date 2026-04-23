/**
 * Shared 19-program list with slugs for enrollment and course tracking.
 * Single source of truth — used by /programs, dashboard program picker, training.
 * Icons are Lucide icon names — rendered by components that import from lucide-react.
 */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface ProgramCourse {
  slug: string;
  name: string;
  estimatedHours: number;
}

export interface Program {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  categoryColor: string;
  borderColor: string;
  icon: string;
  duration: string;
  salary: string;
  skills: string[];
  courses: ProgramCourse[];
  partner: string;
}

function mkProgram(
  title: string,
  category: string,
  categoryLabel: string,
  categoryColor: string,
  icon: string,
  duration: string,
  salary: string,
  skills: string[],
  courseNames: string[],
  partner: string,
  defaultHours = 10,
  /** Preserve slug when display title changes (URLs, enrollments). */
  slugOverride?: string
): Program {
  const slug = slugOverride ?? slugify(title);
  const courses: ProgramCourse[] = courseNames.map((name, i) => ({
    slug: `${slug}-course-${i + 1}`,
    name,
    estimatedHours: defaultHours,
  }));
  return {
    slug,
    title,
    category,
    categoryLabel,
    categoryColor,
    borderColor: categoryColor,
    icon,
    duration,
    salary,
    skills,
    courses,
    partner,
  };
}

const STANDARD_PROGRAM_DURATION = '6 weeks, 5 hrs/week (30 hours total)';

export const PROGRAMS: Program[] = [
  mkProgram('Digital Literacy Empowerment Class', 'digital-literacy', 'Digital Literacy', '#666', '💻', STANDARD_PROGRAM_DURATION, 'Starting salary: $38K-$52K', ['Digital literacy', 'Email', 'Financial literacy', 'Online safety'], ['Orientation & Informational Session', 'Device Distribution & Setup + Browser & Search Engines', 'Introduction to Emails & Advanced Email Techniques', 'Avoiding Online Scams + Introduction to Financial Literacy', 'PCC Portal & Connect ATX Navigation', 'Graduation, Exit Surveys & ETP Forms'], 'WorkforceAP', 5),
  mkProgram('IT Support Professional Certificate (IBM)', 'it-cyber', 'IT & Cybersecurity', '#ad2c4d', '💻', STANDARD_PROGRAM_DURATION, 'Starting salary: $55K-$72K', ['Help desk', 'Hardware', 'Software', 'Customer service'], ['Introduction to Technical Support', 'Introduction to Hardware and Operating Systems', 'Introduction to Software, Programming, and Databases', 'Introduction to Networking and Storage', 'Introduction to Cybersecurity Essentials', 'Introduction to Cloud Computing', 'Technical Support Case Studies and Capstone Project'], 'IBM', 5),
  mkProgram('AI Professional Practitioner Certificate', 'ai-software', 'AI & Software Dev', '#8b4a9b', '🤖', STANDARD_PROGRAM_DURATION, 'Starting salary: $85K-$135K', ['Python', 'AI/ML', 'Generative AI', 'Flask'], ['Introduction to Software Engineering', 'Introduction to Artificial Intelligence (AI)', 'Generative AI: Introduction and Applications', 'Generative AI: Prompt Engineering Basics', 'Introduction to HTML, CSS, & JavaScript', 'Python for Data Science, AI & Development', 'Developing AI Applications with Python and Flask', 'Building Generative AI-Powered Applications with Python', 'Generative AI: Elevate your Software Development Career', 'Software Developer Career Guide and Interview Preparation'], 'IBM', 5, 'ai-professional-developer-certificate-ibm'),
  mkProgram('Project Management Professional Certificate (Microsoft)', 'business', 'Business', '#a47f38', '💼', STANDARD_PROGRAM_DURATION, 'Starting salary: $82K-$112K', ['Agile', 'Scrum', 'MS Project', 'Risk management'], ['Project Management Foundations', 'Initiating and Planning Projects', 'Project Scheduling and Cost Management', 'Managing Project Risks, Changes and Stakeholders', 'Project Leadership, Communication and Stakeholder Management', 'Agile Project Management', 'Microsoft Project & Power BI for Project Managers', 'Project Management Capstone'], 'Microsoft', 5),
  mkProgram('Data Analytics Professional Certificate (Google)', 'cloud-data', 'Cloud & Data', '#a47f38', '📊', STANDARD_PROGRAM_DURATION, 'Starting salary: $72K-$102K', ['Spreadsheets', 'SQL', 'R', 'Tableau', 'Data viz'], ['Foundations: Data, Data, Everywhere', 'Ask Questions to Make Data-Driven Decisions', 'Prepare Data for Exploration', 'Process Data from Dirty to Clean', 'Analyze Data to Answer Questions', 'Share Data Through the Art of Visualization', 'Data Analysis with R Programming', 'Google Data Analytics Capstone'], 'Google', 5),
  mkProgram('Data Science Professional Certificate (IBM)', 'cloud-data', 'Cloud & Data', '#a47f38', '📊', STANDARD_PROGRAM_DURATION, 'Starting salary: $88K-$130K', ['Python', 'SQL', 'Machine Learning', 'Jupyter'], ['What is Data Science?', 'Tools for Data Science', 'Data Science Methodology', 'Python for Data Science, AI & Development', 'Python Project for Data Science', 'Databases and SQL for Data Science with Python', 'Data Analysis with Python', 'Data Visualization with Python', 'Machine Learning with Python', 'Applied Data Science Capstone'], 'IBM', 5),
  mkProgram('AWS Cloud Technology (Amazon)', 'cloud-data', 'Cloud & Data', '#2b7bb9', '☁️', STANDARD_PROGRAM_DURATION, 'Starting salary: $95K-$145K', ['AWS', 'Cloud architecture', 'DevOps', 'Python'], ['Introduction to Information Technology and AWS Cloud', 'Providing Technical Support for AWS Workloads', 'Developing Applications in Python on AWS', 'Skills for Working as an AWS Cloud Consultant', 'DevOps on AWS and Project Management', 'Automation in the AWS Cloud', 'Data Analytics and Databases on AWS', 'Capstone: Following the AWS Well Architected Framework'], 'Amazon Web Services', 5),
  mkProgram('Software Developer Professional Certificate (IBM)', 'ai-software', 'AI & Software Dev', '#8b4a9b', '💻', STANDARD_PROGRAM_DURATION, 'Starting salary: $78K-$98K', ['HTML', 'CSS', 'JavaScript', 'Python', 'Databases'], ['Introduction to Software Engineering', 'Introduction to HTML, CSS, & JavaScript', 'Getting Started with Git and GitHub', 'Python for Data Science, AI & Development', 'Developing Front-End Apps with React', 'Developing Back-End Apps with Node.js and Express', 'Django Application Development with SQL and Databases', 'Introduction to Containers w/ Docker, Kubernetes & OpenShift', 'Application Development using Microservices and Serverless', 'Software Developer Career Guide & Interview Preparation'], 'IBM', 5),
  mkProgram('IT Automation with Python (Google)', 'it-cyber', 'IT & Cybersecurity', '#ad2c4d', '💻', STANDARD_PROGRAM_DURATION, 'Starting salary: $78K-$98K', ['Python', 'Git', 'Bash', 'APIs', 'IT automation'], ['Crash Course on Python', 'Using Python to Interact with the Operating System', 'Introduction to Git and GitHub', 'Troubleshooting and Debugging Techniques', 'Configuration Management and the Cloud', 'Automating Real-World Tasks with Python'], 'Google', 5),
  mkProgram('CompTIA A+ Professional Certificate', 'it-cyber', 'IT & Cybersecurity', '#ad2c4d', '🛡️', STANDARD_PROGRAM_DURATION, 'Starting salary: $55K-$78K', ['Hardware', 'Networking', 'Security', 'OS'], ['IT Fundamentals and Hardware Essentials', 'Networking, Peripherals, and Wireless Technologies', 'Advanced Networking, Virtualization, and IT Security', 'Foundations of Computer Hardware and Storage', 'Operating Systems and Networking Fundamentals', 'Advanced Networking, Security, and IT Operations', 'Practice Exams for CompTIA A+ Core 1 & Core 2'], 'CompTIA', 5),
  mkProgram('CompTIA Network+ Professional Certificate', 'it-cyber', 'IT & Cybersecurity', '#ad2c4d', '🛡️', STANDARD_PROGRAM_DURATION, 'Starting salary: $60K-$88K', ['Networking', 'TCP/IP', 'Cisco', 'Wireless'], ['Introduction to Networking', 'Networking Fundamentals', 'Introduction to Contemporary Operating Systems and Hardware', 'Introduction to Networking and Storage', 'Basics of Cisco Networking', 'CCNA Foundations', 'TCP/IP and Advanced Topics', 'Operating Systems and Networking Fundamentals', 'Network Foundations and Addressing'], 'CompTIA', 5),
  mkProgram('CompTIA Security+ Professional Certificate', 'it-cyber', 'IT & Cybersecurity', '#ad2c4d', '🛡️', STANDARD_PROGRAM_DURATION, 'Starting salary: $72K-$108K', ['Network security', 'Risk management', 'Cryptography'], ['Network Security', 'Introduction to Network Security', 'System and Network Security', 'Computer Networks and Network Security'], 'CompTIA', 5),
  mkProgram('Cybersecurity Professional Certificate (Google)', 'it-cyber', 'IT & Cybersecurity', '#ad2c4d', '🛡️', STANDARD_PROGRAM_DURATION, 'Starting salary: $75K-$112K', ['Linux', 'SQL', 'Python', 'Incident response'], ['Foundations of Cybersecurity', 'Play It Safe: Manage Security Risks', 'Connect and Protect: Networks and Network Security', 'Tools of the Trade: Linux and SQL', 'Assets, Threats, and Vulnerabilities', 'Sound the Alarm: Detection and Response', 'Automate Cybersecurity Tasks with Python', 'Put It to Work: Prepare for Cybersecurity Jobs'], 'Google', 5),
  mkProgram('Digital Marketing & E-Commerce (Google)', 'business', 'Business', '#a47f38', '💼', STANDARD_PROGRAM_DURATION, 'Starting salary: $62K-$78K', ['SEO', 'SEM', 'Email marketing', 'Analytics'], ['Foundations of Digital Marketing and E-commerce', 'Attract and Engage Customers with Digital Marketing', 'From Likes to Leads: Interact with Customers Online', 'Think Outside the Inbox: Email Marketing', 'Assess for Success: Marketing Analytics and Measurement', 'Make the Sale: Build, Launch, and Manage E-commerce Stores', 'Satisfaction Guaranteed: Develop Customer Loyalty Online'], 'Google', 5),
  mkProgram('UX Design Professional Certificate (Google)', 'business', 'Business', '#a47f38', '💼', STANDARD_PROGRAM_DURATION, 'Starting salary: $88K-$120K', ['User research', 'Wireframing', 'Figma', 'Prototyping'], ['Foundations of User Experience (UX) Design', 'Start the UX Design Process: Empathize, Define, and Ideate', 'Build Wireframes and Low-Fidelity Prototypes', 'Conduct UX Research and Test Early Concepts', 'Create High-Fidelity Designs and Prototypes in Figma', 'Responsive Web Design in Adobe XD', 'Design a User Experience for Social Good & Prepare for Jobs'], 'Google', 5),
  mkProgram(
    'Medical Billing, Coding, and Health Information Technology (MBCHIT)',
    'healthcare',
    'Healthcare',
    '#4a9b4f',
    '❤️',
    STANDARD_PROGRAM_DURATION,
    'Starting salary: $52K-$72K',
    ['Medical coding', 'EHR', 'HIPAA', 'ICD-10'],
    [
      'Introduction to Health Information Technology',
      'Medical Terminology and Anatomy',
      'Health Information Management',
      'Electronic Health Records (EHR)',
      'Healthcare Law, Ethics & HIPAA',
      'Medical Billing & Coding: ICD-10 and CPT',
      'Revenue Cycle Management',
      'Capstone: HIT Practice Simulation',
    ],
    'MBCHIT',
    5,
    'health-information-technology-mchit'
  ),
  mkProgram('Certified Production Technician (CPT)', 'manufacturing', 'Manufacturing', '#1a1a1a', '🏭', STANDARD_PROGRAM_DURATION, 'Starting salary: $48K-$70K', ['CNC', 'Manufacturing processes', 'Quality control'], ['Introduction to Manufacturing', 'Blueprint Reading and Technical Drawing', 'Machining and CNC Operations', 'Welding Fundamentals', 'Quality Control and Inspection', 'Safety and OSHA Compliance', 'Lean Manufacturing Principles', 'Production Technology Capstone'], 'CPT', 5),
  mkProgram('Certified Logistics Technician (CLT)', 'manufacturing', 'Manufacturing', '#1a1a1a', '🏭', STANDARD_PROGRAM_DURATION, 'Starting salary: $55K-$78K', ['Supply chain', 'Inventory', 'Transportation', 'SAP'], ['Introduction to Supply Chain Management', 'Inventory Management and Control', 'Transportation and Distribution', 'Warehouse Operations', 'Procurement and Vendor Management', 'Supply Chain Technology and SAP', 'Global Supply Chain and Trade', 'CLT Certification Preparation'], 'CLT', 5),
  mkProgram('Core Construction', 'manufacturing', 'Manufacturing', '#1a1a1a', '🏗️', STANDARD_PROGRAM_DURATION, 'Starting salary: $48K-$68K', ['OSHA-10', 'Blueprint reading', 'Construction fundamentals'], ['Introduction to Construction Industry', 'Blueprint Reading and Construction Math', 'Construction Safety and OSHA-10', 'Hand and Power Tools', 'Concrete and Masonry Fundamentals', 'Carpentry and Framing Basics', 'Electrical and Plumbing Basics', 'Construction Readiness Capstone'], 'OSHA-10 / WorkforceAP', 5, 'core-construction-training-certificate'),
];

/** Canonical number of training tracks in the public catalog (keep stats + hero aligned). */
export const WORKFORCEAP_PROGRAM_CATALOG_SIZE = PROGRAMS.length;

/**
 * Maps each program slug to skill scores across the 6 modern radar axes.
 * Scores 0–100 reflect how much the program builds competency on each axis.
 * Used by Skill Mapper to recommend programs that close skill gaps.
 */
export const PROGRAM_AXIS_MAP: Record<string, Record<string, number>> = {
  // Digital Literacy
  'digital-literacy-empowerment-class': {
    Analytics: 20, Engineering: 20, Design: 15, Strategy: 15, Ethics: 35, Research: 20,
  },
  // AI & Software Dev
  'ai-professional-developer-certificate-ibm': {
    Analytics: 75, Engineering: 85, Design: 20, Strategy: 25, Ethics: 35, Research: 60,
  },
  'software-developer-professional-certificate-ibm': {
    Analytics: 40, Engineering: 90, Design: 35, Strategy: 25, Ethics: 25, Research: 35,
  },
  // Cloud & Data
  'aws-cloud-technology-amazon': {
    Analytics: 55, Engineering: 90, Design: 15, Strategy: 45, Ethics: 30, Research: 35,
  },
  'data-analytics-professional-certificate-google': {
    Analytics: 90, Engineering: 45, Design: 40, Strategy: 35, Ethics: 25, Research: 60,
  },
  'data-science-professional-certificate-ibm': {
    Analytics: 90, Engineering: 60, Design: 25, Strategy: 30, Ethics: 25, Research: 75,
  },
  // IT & Cybersecurity
  'comptia-a-professional-certificate': {
    Analytics: 40, Engineering: 80, Design: 10, Strategy: 25, Ethics: 35, Research: 30,
  },
  'comptia-network-professional-certificate': {
    Analytics: 45, Engineering: 85, Design: 10, Strategy: 25, Ethics: 30, Research: 30,
  },
  'comptia-security-professional-certificate': {
    Analytics: 55, Engineering: 75, Design: 10, Strategy: 40, Ethics: 65, Research: 40,
  },
  'it-support-professional-certificate-ibm': {
    Analytics: 30, Engineering: 70, Design: 10, Strategy: 20, Ethics: 45, Research: 25,
  },
  'it-automation-with-python-google': {
    Analytics: 45, Engineering: 85, Design: 10, Strategy: 30, Ethics: 25, Research: 35,
  },
  'cybersecurity-professional-certificate-google': {
    Analytics: 55, Engineering: 75, Design: 10, Strategy: 35, Ethics: 70, Research: 45,
  },
  // Business
  'project-management-professional-certificate-microsoft': {
    Analytics: 40, Engineering: 25, Design: 15, Strategy: 90, Ethics: 40, Research: 35,
  },
  'digital-marketing-e-commerce-google': {
    Analytics: 55, Engineering: 20, Design: 60, Strategy: 65, Ethics: 30, Research: 45,
  },
  'ux-design-professional-certificate-google': {
    Analytics: 35, Engineering: 25, Design: 90, Strategy: 30, Ethics: 35, Research: 55,
  },
  // Healthcare
  'health-information-technology-mchit': {
    Analytics: 50, Engineering: 30, Design: 10, Strategy: 25, Ethics: 75, Research: 55,
  },
  // Manufacturing
  'certified-production-technician-cpt': {
    Analytics: 35, Engineering: 70, Design: 15, Strategy: 30, Ethics: 45, Research: 25,
  },
  'certified-logistics-technician-clt': {
    Analytics: 55, Engineering: 40, Design: 10, Strategy: 65, Ethics: 30, Research: 30,
  },
  'construction-readiness-certificate-osha-10': {
    Analytics: 25, Engineering: 55, Design: 20, Strategy: 25, Ethics: 60, Research: 20,
  },
};

export type RadarAxis = 'Analytics' | 'Engineering' | 'Design' | 'Strategy' | 'Ethics' | 'Research';
export const RADAR_AXES: RadarAxis[] = ['Analytics', 'Engineering', 'Design', 'Strategy', 'Ethics', 'Research'];

export interface ProgramRecommendation {
  program: Program;
  /** Which gap axis this program primarily addresses */
  primaryAxis: string;
  /** How much the program boosts the gap axis (0–100) */
  axisScore: number;
  /** Human-readable reason */
  reason: string;
  /** Total relevance score across all gap axes */
  relevance: number;
}

/**
 * Given a member skill profile and an optional target profile, recommend programs
 * that best close the member's skill gaps.
 */
export function recommendProgramsForGaps(
  memberProfile: { axis: string; value: number }[],
  targetProfile?: { axis: string; value: number }[],
  maxResults = 4,
): ProgramRecommendation[] {
  // Compute gap per axis (value is 0–1 scale)
  const gaps: { axis: string; gap: number; memberVal: number; targetVal: number }[] = RADAR_AXES.map((axis) => {
    const memberVal = memberProfile.find((p) => p.axis === axis)?.value ?? 0;
    const targetVal = targetProfile
      ? (targetProfile.find((p) => p.axis === axis)?.value ?? 0)
      : 0.7; // Default target: 70% if no occupation selected
    const gap = Math.max(0, targetVal - memberVal);
    return { axis, gap, memberVal, targetVal };
  }).filter((g) => g.gap > 0.1) // Only axes with >10% gap
    .sort((a, b) => b.gap - a.gap);

  if (gaps.length === 0) return [];

  // Score each program by how well it addresses the top gaps
  const scored: ProgramRecommendation[] = [];
  for (const program of PROGRAMS) {
    const axisMap = PROGRAM_AXIS_MAP[program.slug];
    if (!axisMap) continue;

    let totalRelevance = 0;
    let bestAxis = '';
    let bestScore = 0;

    for (const gap of gaps) {
      const programScore = axisMap[gap.axis] ?? 0;
      // Weight by gap magnitude — bigger gaps matter more
      const weighted = (programScore / 100) * gap.gap;
      totalRelevance += weighted;
      if (programScore > bestScore) {
        bestScore = programScore;
        bestAxis = gap.axis;
      }
    }

    if (totalRelevance > 0 && bestScore >= 40) {
      scored.push({
        program,
        primaryAxis: bestAxis,
        axisScore: bestScore,
        reason: `Builds ${bestAxis} skills (${bestScore}%)`,
        relevance: Math.round(totalRelevance * 100),
      });
    }
  }

  scored.sort((a, b) => b.relevance - a.relevance);
  return scored.slice(0, maxResults);
}

export const PROGRAM_TITLES = PROGRAMS.map((p) => p.title) as readonly string[];

/** Resolve program from stored interest (slug or full title from apply/signup lists). */
export function getProgramByInterestValue(interest: string): Program | undefined {
  const trimmed = interest.trim();
  if (!trimmed) return undefined;
  const bySlug = PROGRAMS.find((p) => p.slug === trimmed);
  if (bySlug) return bySlug;
  const slugGuess = slugify(trimmed);
  const bySlugGuess = PROGRAMS.find((p) => p.slug === slugGuess);
  if (bySlugGuess) return bySlugGuess;
  return PROGRAMS.find((p) => p.title === trimmed);
}

/**
 * Resolve a catalog program from a slug or other stored label (e.g. `enrolledProgram` may be a
 * canonical slug or a full program title). Prefer this over matching `slug` alone.
 */
export function getProgramBySlug(slug: string): Program | undefined {
  return getProgramByInterestValue(slug);
}
