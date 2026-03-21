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

export const PROGRAMS: Program[] = [
  mkProgram('Digital Literacy Empowerment Class', 'digital-literacy', 'Digital Literacy', '#666', '💻', '6-7 Weeks, 20 hrs/week', 'Starting salary: $38K-$52K', ['Digital literacy', 'Email', 'Financial literacy', 'Online safety'], ['Orientation & Informational Session', 'Device Distribution & Setup + Browser & Search Engines', 'Introduction to Emails & Advanced Email Techniques', 'Avoiding Online Scams + Introduction to Financial Literacy', 'PCC Portal & Connect ATX Navigation', 'Graduation, Exit Surveys & ETP Forms'], 'WorkforceAP', 4),
  mkProgram('AI Professional Developer Certificate (IBM)', 'ai-software', 'AI & Software Dev', '#8b4a9b', '🤖', '3-5 months, 10 hrs/week', 'Starting salary: $85K-$135K', ['Python', 'AI/ML', 'Generative AI', 'Flask'], ['Introduction to Software Engineering', 'Introduction to Artificial Intelligence (AI)', 'Generative AI: Introduction and Applications', 'Generative AI: Prompt Engineering Basics', 'Introduction to HTML, CSS, & JavaScript', 'Python for Data Science, AI & Development', 'Developing AI Applications with Python and Flask', 'Building Generative AI-Powered Applications with Python', 'Generative AI: Elevate your Software Development Career', 'Software Developer Career Guide and Interview Preparation'], 'IBM'),
  mkProgram('AWS Cloud Technology (Amazon)', 'cloud-data', 'Cloud & Data', '#2b7bb9', '☁️', '3-5 months, 10 hrs/week', 'Starting salary: $95K-$145K', ['AWS', 'Cloud architecture', 'DevOps', 'Python'], ['Introduction to Information Technology and AWS Cloud', 'Providing Technical Support for AWS Workloads', 'Developing Applications in Python on AWS', 'Skills for Working as an AWS Cloud Consultant', 'DevOps on AWS and Project Management', 'Automation in the AWS Cloud', 'Data Analytics and Databases on AWS', 'Capstone: Following the AWS Well Architected Framework'], 'Amazon Web Services'),
  mkProgram('CompTIA A+ Professional Certificate', 'it-cyber', 'IT & Cybersecurity', '#ad2c4d', '🛡️', '3-5 months, 10 hrs/week', 'Starting salary: $55K-$78K', ['Hardware', 'Networking', 'Security', 'OS'], ['IT Fundamentals and Hardware Essentials', 'Networking, Peripherals, and Wireless Technologies', 'Advanced Networking, Virtualization, and IT Security', 'Foundations of Computer Hardware and Storage', 'Operating Systems and Networking Fundamentals', 'Advanced Networking, Security, and IT Operations', 'Practice Exams for CompTIA A+ Core 1 & Core 2'], 'CompTIA'),
  mkProgram('CompTIA Network+ Professional Certificate', 'it-cyber', 'IT & Cybersecurity', '#ad2c4d', '🛡️', '3-5 months, 10 hrs/week', 'Starting salary: $60K-$88K', ['Networking', 'TCP/IP', 'Cisco', 'Wireless'], ['Introduction to Networking', 'Networking Fundamentals', 'Introduction to Contemporary Operating Systems and Hardware', 'Introduction to Networking and Storage', 'Basics of Cisco Networking', 'CCNA Foundations', 'TCP/IP and Advanced Topics', 'Operating Systems and Networking Fundamentals', 'Network Foundations and Addressing'], 'CompTIA'),
  mkProgram('CompTIA Security+ Professional Certificate', 'it-cyber', 'IT & Cybersecurity', '#ad2c4d', '🛡️', '3-5 months, 10 hrs/week', 'Starting salary: $72K-$108K', ['Network security', 'Risk management', 'Cryptography'], ['Network Security', 'Introduction to Network Security', 'System and Network Security', 'Computer Networks and Network Security'], 'CompTIA'),
  mkProgram('Cybersecurity Professional Certificate (Google)', 'it-cyber', 'IT & Cybersecurity', '#ad2c4d', '🛡️', '3-5 months, 10 hrs/week', 'Starting salary: $75K-$112K', ['Linux', 'SQL', 'Python', 'Incident response'], ['Foundations of Cybersecurity', 'Play It Safe: Manage Security Risks', 'Connect and Protect: Networks and Network Security', 'Tools of the Trade: Linux and SQL', 'Assets, Threats, and Vulnerabilities', 'Sound the Alarm: Detection and Response', 'Automate Cybersecurity Tasks with Python', 'Put It to Work: Prepare for Cybersecurity Jobs'], 'Google'),
  mkProgram('Data Analytics Professional Certificate (Google)', 'cloud-data', 'Cloud & Data', '#a47f38', '📊', '3-5 months, 10 hrs/week', 'Starting salary: $72K-$102K', ['Spreadsheets', 'SQL', 'R', 'Tableau', 'Data viz'], ['Foundations: Data, Data, Everywhere', 'Ask Questions to Make Data-Driven Decisions', 'Prepare Data for Exploration', 'Process Data from Dirty to Clean', 'Analyze Data to Answer Questions', 'Share Data Through the Art of Visualization', 'Data Analysis with R Programming', 'Google Data Analytics Capstone'], 'Google'),
  mkProgram('Data Science Professional Certificate (IBM)', 'cloud-data', 'Cloud & Data', '#a47f38', '📊', '3-5 months, 10 hrs/week', 'Starting salary: $88K-$130K', ['Python', 'SQL', 'Machine Learning', 'Jupyter'], ['What is Data Science?', 'Tools for Data Science', 'Data Science Methodology', 'Python for Data Science, AI & Development', 'Python Project for Data Science', 'Databases and SQL for Data Science with Python', 'Data Analysis with Python', 'Data Visualization with Python', 'Machine Learning with Python', 'Applied Data Science Capstone'], 'IBM'),
  mkProgram('Project Management Professional Certificate (Microsoft)', 'business', 'Business', '#a47f38', '💼', '3-5 months, 10 hrs/week', 'Starting salary: $82K-$112K', ['Agile', 'Scrum', 'MS Project', 'Risk management'], ['Project Management Foundations', 'Initiating and Planning Projects', 'Project Scheduling and Cost Management', 'Managing Project Risks, Changes and Stakeholders', 'Project Leadership, Communication and Stakeholder Management', 'Agile Project Management', 'Microsoft Project & Power BI for Project Managers', 'Project Management Capstone'], 'Microsoft'),
  mkProgram('Digital Marketing & E-Commerce (Google)', 'business', 'Business', '#a47f38', '💼', '3-5 months, 10 hrs/week', 'Starting salary: $62K-$78K', ['SEO', 'SEM', 'Email marketing', 'Analytics'], ['Foundations of Digital Marketing and E-commerce', 'Attract and Engage Customers with Digital Marketing', 'From Likes to Leads: Interact with Customers Online', 'Think Outside the Inbox: Email Marketing', 'Assess for Success: Marketing Analytics and Measurement', 'Make the Sale: Build, Launch, and Manage E-commerce Stores', 'Satisfaction Guaranteed: Develop Customer Loyalty Online'], 'Google'),
  mkProgram('UX Design Professional Certificate (Google)', 'business', 'Business', '#a47f38', '💼', '3-5 months, 10 hrs/week', 'Starting salary: $88K-$120K', ['User research', 'Wireframing', 'Figma', 'Prototyping'], ['Foundations of User Experience (UX) Design', 'Start the UX Design Process: Empathize, Define, and Ideate', 'Build Wireframes and Low-Fidelity Prototypes', 'Conduct UX Research and Test Early Concepts', 'Create High-Fidelity Designs and Prototypes in Figma', 'Responsive Web Design in Adobe XD', 'Design a User Experience for Social Good & Prepare for Jobs'], 'Google'),
  mkProgram('IT Support Professional Certificate (IBM)', 'it-cyber', 'IT & Cybersecurity', '#ad2c4d', '💻', '3-5 months, 10 hrs/week', 'Starting salary: $55K-$72K', ['Help desk', 'Hardware', 'Software', 'Customer service'], ['Introduction to Technical Support', 'Introduction to Hardware and Operating Systems', 'Introduction to Software, Programming, and Databases', 'Introduction to Networking and Storage', 'Introduction to Cybersecurity Essentials', 'Introduction to Cloud Computing', 'Technical Support Case Studies and Capstone Project'], 'IBM'),
  mkProgram('IT Automation with Python (Google)', 'it-cyber', 'IT & Cybersecurity', '#ad2c4d', '💻', '3-5 months, 10 hrs/week', 'Starting salary: $78K-$98K', ['Python', 'Git', 'Bash', 'APIs', 'IT automation'], ['Crash Course on Python', 'Using Python to Interact with the Operating System', 'Introduction to Git and GitHub', 'Troubleshooting and Debugging Techniques', 'Configuration Management and the Cloud', 'Automating Real-World Tasks with Python'], 'Google'),
  mkProgram(
    'Medical Coding & Health Information Technology (MCHIT)',
    'healthcare',
    'Healthcare',
    '#4a9b4f',
    '❤️',
    '3-5 months, 10 hrs/week',
    'Starting salary: $52K-$72K',
    ['Medical coding', 'EHR', 'HIPAA', 'ICD-10'],
    [
      'Introduction to Health Information Technology',
      'Medical Terminology and Anatomy',
      'Health Information Management',
      'Electronic Health Records (EHR)',
      'Healthcare Law, Ethics & HIPAA',
      'Medical Coding: ICD-10 and CPT',
      'Revenue Cycle Management',
      'Capstone: HIT Practice Simulation',
    ],
    'MCHIT',
    10,
    'health-information-technology-mchit'
  ),
  mkProgram('Production Technology Certificate (CPT)', 'manufacturing', 'Manufacturing', '#1a1a1a', '🏭', '3-5 months, 10 hrs/week', 'Starting salary: $48K-$70K', ['CNC', 'Manufacturing processes', 'Quality control'], ['Introduction to Manufacturing', 'Blueprint Reading and Technical Drawing', 'Machining and CNC Operations', 'Welding Fundamentals', 'Quality Control and Inspection', 'Safety and OSHA Compliance', 'Lean Manufacturing Principles', 'Production Technology Capstone'], 'CPT'),
  mkProgram('Logistics and Supply Chain Certificate (CLT)', 'manufacturing', 'Manufacturing', '#1a1a1a', '🏭', '3-5 months, 10 hrs/week', 'Starting salary: $55K-$78K', ['Supply chain', 'Inventory', 'Transportation', 'SAP'], ['Introduction to Supply Chain Management', 'Inventory Management and Control', 'Transportation and Distribution', 'Warehouse Operations', 'Procurement and Vendor Management', 'Supply Chain Technology and SAP', 'Global Supply Chain and Trade', 'CLT Certification Preparation'], 'CLT'),
  mkProgram('Construction Readiness Certificate (OSHA-10)', 'manufacturing', 'Manufacturing', '#1a1a1a', '🏗️', '3-5 months, 10 hrs/week', 'Starting salary: $48K-$68K', ['OSHA-10', 'Blueprint reading', 'Construction fundamentals'], ['Introduction to Construction Industry', 'Blueprint Reading and Construction Math', 'Construction Safety and OSHA-10', 'Hand and Power Tools', 'Concrete and Masonry Fundamentals', 'Carpentry and Framing Basics', 'Electrical and Plumbing Basics', 'Construction Readiness Capstone'], 'OSHA-10 / WorkforceAP'),
  mkProgram('Software Developer Professional Certificate (IBM)', 'ai-software', 'AI & Software Dev', '#8b4a9b', '💻', '4-6 months, 10 hrs/week', 'Starting salary: $78K-$98K', ['HTML', 'CSS', 'JavaScript', 'Python', 'Databases'], ['Introduction to Software Engineering', 'Introduction to HTML, CSS, & JavaScript', 'Getting Started with Git and GitHub', 'Python for Data Science, AI & Development', 'Developing Front-End Apps with React', 'Developing Back-End Apps with Node.js and Express', 'Django Application Development with SQL and Databases', 'Introduction to Containers w/ Docker, Kubernetes & OpenShift', 'Application Development using Microservices and Serverless', 'Software Developer Career Guide & Interview Preparation'], 'IBM'),
];

export const PROGRAM_TITLES = PROGRAMS.map((p) => p.title) as readonly string[];

export function getProgramBySlug(slug: string): Program | undefined {
  return PROGRAMS.find((p) => p.slug === slug);
}
