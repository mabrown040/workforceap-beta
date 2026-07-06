/**
 * Course-to-Skill Mapping for Skill Mapper
 * 
 * Maps individual courses to radar axes and specific O*NET skills.
 * Used to:
 * 1. Show which courses close which skill gaps
 * 2. Provide fallback Design scores when O*NET returns empty
 * 3. Drive conversion by linking specific skills to specific courses
 */

import { ProgramCourse } from './programs';

export interface CourseSkillContribution {
  axis: 'Analytics' | 'Engineering' | 'Design' | 'Strategy' | 'Service' | 'Research';
  score: number; // 0-100 contribution to this axis
  specificSkills: string[]; // Human-readable skills
}

export interface CourseSkillMapping {
  courseSlug: string;
  courseName: string;
  programSlug: string;
  programTitle: string;
  partner: string;
  estimatedHours: number;
  contributions: CourseSkillContribution[];
  onetSkillsAddressed: string[]; // O*NET skill names this course covers
  technologies: string[]; // Tech/tools learned
  softSkills: string[]; // Service, communication, etc.
}

// ============================================================================
// DIGITAL LITERACY
// ============================================================================

const DIGITAL_LITERACY_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'digital-literacy-course-1',
    courseName: 'Orientation & Informational Session',
    programSlug: 'digital-literacy-empowerment-class',
    programTitle: 'Digital Literacy Empowerment Class',
    partner: 'WorkforceAP',
    estimatedHours: 4,
    contributions: [
      { axis: 'Service', score: 25, specificSkills: ['Online safety awareness', 'Digital citizenship'] },
      { axis: 'Strategy', score: 15, specificSkills: ['Goal setting', 'Program navigation'] },
    ],
    onetSkillsAddressed: ['Active Learning', 'Speaking'],
    technologies: ['Web Browser'],
    softSkills: ['Communication', 'Professionalism'],
  },
  {
    courseSlug: 'digital-literacy-course-2',
    courseName: 'Device Distribution & Setup + Browser & Search Engines',
    programSlug: 'digital-literacy-empowerment-class',
    programTitle: 'Digital Literacy Empowerment Class',
    partner: 'WorkforceAP',
    estimatedHours: 4,
    contributions: [
      { axis: 'Engineering', score: 20, specificSkills: ['Device setup', 'Browser navigation'] },
      { axis: 'Research', score: 20, specificSkills: ['Search engine use', 'Information retrieval'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Troubleshooting'],
    technologies: ['Chrome', 'Windows', 'Search Engines'],
    softSkills: ['Problem-solving'],
  },
  {
    courseSlug: 'digital-literacy-course-3',
    courseName: 'Introduction to Emails & Advanced Email Techniques',
    programSlug: 'digital-literacy-empowerment-class',
    programTitle: 'Digital Literacy Empowerment Class',
    partner: 'WorkforceAP',
    estimatedHours: 4,
    contributions: [
      { axis: 'Service', score: 30, specificSkills: ['Email etiquette', 'Professional communication'] },
      { axis: 'Strategy', score: 20, specificSkills: ['Inbox management', 'Organization'] },
    ],
    onetSkillsAddressed: ['Written Comprehension', 'Written Expression'],
    technologies: ['Gmail', 'Email'],
    softSkills: ['Communication', 'Time Management'],
  },
  {
    courseSlug: 'digital-literacy-course-4',
    courseName: 'Avoiding Online Scams + Introduction to Financial Literacy',
    programSlug: 'digital-literacy-empowerment-class',
    programTitle: 'Digital Literacy Empowerment Class',
    partner: 'WorkforceAP',
    estimatedHours: 4,
    contributions: [
      { axis: 'Service', score: 35, specificSkills: ['Security awareness', 'Fraud prevention'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Financial literacy', 'Budgeting basics'] },
    ],
    onetSkillsAddressed: ['Critical Thinking', 'Judgment and Decision Making'],
    technologies: [],
    softSkills: ['Security Awareness', 'Financial Responsibility'],
  },
];

// ============================================================================
// DATA ANALYTICS (Google)
// ============================================================================

const DATA_ANALYTICS_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'data-analytics-course-1',
    courseName: 'Foundations: Data, Data, Everywhere',
    programSlug: 'data-analytics-professional-certificate-google',
    programTitle: 'Data Analytics Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 15, specificSkills: ['Data literacy', 'Spreadsheet basics', 'Data types'] },
      { axis: 'Research', score: 10, specificSkills: ['Data collection concepts', 'Research methodology'] },
    ],
    onetSkillsAddressed: ['Reading Comprehension', 'Active Learning', 'Critical Thinking'],
    technologies: ['Spreadsheets', 'Google Sheets'],
    softSkills: ['Curiosity', 'Attention to detail'],
  },
  {
    courseSlug: 'data-analytics-course-2',
    courseName: 'Ask Questions to Make Data-Driven Decisions',
    programSlug: 'data-analytics-professional-certificate-google',
    programTitle: 'Data Analytics Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 20, specificSkills: ['Problem framing', 'Hypothesis formation', 'Questioning'] },
      { axis: 'Strategy', score: 20, specificSkills: ['Business context', 'Stakeholder needs'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Complex Problem Solving', 'Judgment and Decision Making'],
    technologies: [],
    softSkills: ['Business acumen', 'Critical thinking'],
  },
  {
    courseSlug: 'data-analytics-course-3',
    courseName: 'Prepare Data for Exploration',
    programSlug: 'data-analytics-professional-certificate-google',
    programTitle: 'Data Analytics Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 25, specificSkills: ['Data cleaning', 'Data validation', 'Quality assurance'] },
      { axis: 'Engineering', score: 15, specificSkills: ['Spreadsheet functions', 'Data organization'] },
    ],
    onetSkillsAddressed: ['Quality Control Analysis', 'Programming', 'Mathematics'],
    technologies: ['SQL', 'Spreadsheets', 'BigQuery'],
    softSkills: ['Precision', 'Methodical approach'],
  },
  {
    courseSlug: 'data-analytics-course-4',
    courseName: 'Process Data from Dirty to Clean',
    programSlug: 'data-analytics-professional-certificate-google',
    programTitle: 'Data Analytics Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 25, specificSkills: ['Data cleaning', 'ETL concepts', 'Data integrity'] },
      { axis: 'Engineering', score: 20, specificSkills: ['SQL queries', 'Database basics'] },
    ],
    onetSkillsAddressed: ['Programming', 'Systems Analysis', 'Quality Control Analysis'],
    technologies: ['SQL', 'Spreadsheets', 'BigQuery'],
    softSkills: ['Persistence', 'Problem-solving'],
  },
  {
    courseSlug: 'data-analytics-course-5',
    courseName: 'Analyze Data to Answer Questions',
    programSlug: 'data-analytics-professional-certificate-google',
    programTitle: 'Data Analytics Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 30, specificSkills: ['Statistical analysis', 'Aggregation', 'Pivot tables'] },
      { axis: 'Research', score: 15, specificSkills: ['Insight extraction', 'Pattern recognition'] },
    ],
    onetSkillsAddressed: ['Mathematics', 'Critical Thinking', 'Inductive Reasoning'],
    technologies: ['SQL', 'Spreadsheets', 'BigQuery'],
    softSkills: ['Analytical thinking'],
  },
  {
    courseSlug: 'data-analytics-course-6',
    courseName: 'Share Data Through the Art of Visualization',
    programSlug: 'data-analytics-professional-certificate-google',
    programTitle: 'Data Analytics Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Design', score: 40, specificSkills: ['Data visualization', 'Chart design', 'Color theory', 'Dashboard design'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Visual storytelling', 'Insight communication'] },
      { axis: 'Strategy', score: 15, specificSkills: ['Presentation skills', 'Stakeholder communication'] },
    ],
    onetSkillsAddressed: ['Visualization', 'Originality', 'Fluency of Ideas', 'Written Expression'],
    technologies: ['Tableau', 'Data Studio', 'Spreadsheets'],
    softSkills: ['Communication', 'Visual thinking', 'Creativity'],
  },
  {
    courseSlug: 'data-analytics-course-7',
    courseName: 'Data Analysis with R Programming',
    programSlug: 'data-analytics-professional-certificate-google',
    programTitle: 'Data Analytics Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 35, specificSkills: ['R programming', 'Statistical analysis', 'Hypothesis testing'] },
      { axis: 'Engineering', score: 25, specificSkills: ['RStudio', 'Packages', 'Version control', 'Scripting'] },
      { axis: 'Research', score: 20, specificSkills: ['Statistical modeling', 'Data science methods'] },
    ],
    onetSkillsAddressed: ['Programming', 'Mathematics', 'Science', 'Critical Thinking'],
    technologies: ['R', 'RStudio', 'GitHub', 'Tidyverse'],
    softSkills: ['Logical thinking', 'Precision'],
  },
  {
    courseSlug: 'data-analytics-course-8',
    courseName: 'Google Data Analytics Capstone',
    programSlug: 'data-analytics-professional-certificate-google',
    programTitle: 'Data Analytics Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 30, specificSkills: ['End-to-end analysis', 'Portfolio building'] },
      { axis: 'Strategy', score: 25, specificSkills: ['Project management', 'Client simulation'] },
      { axis: 'Engineering', score: 20, specificSkills: ['Tool integration', 'Workflow design'] },
    ],
    onetSkillsAddressed: ['Complex Problem Solving', 'Systems Analysis', 'Time Management'],
    technologies: ['R', 'SQL', 'Tableau', 'BigQuery'],
    softSkills: ['Project management', 'Professionalism'],
  },
];

// ============================================================================
// UX DESIGN (Google)
// ============================================================================

const UX_DESIGN_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'ux-design-course-1',
    courseName: 'Foundations of User Experience (UX) Design',
    programSlug: 'ux-design-professional-certificate-google',
    programTitle: 'UX Design Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Design', score: 35, specificSkills: ['UX principles', 'User-centered design', 'Design thinking'] },
      { axis: 'Research', score: 20, specificSkills: ['User research basics', 'Problem definition'] },
      { axis: 'Strategy', score: 15, specificSkills: ['Business goals alignment', 'Product thinking'] },
    ],
    onetSkillsAddressed: ['Design', 'Originality', 'Fluency of Ideas', 'Systems Analysis'],
    technologies: ['Figma (intro)', 'Design tools'],
    softSkills: ['Empathy', 'User advocacy'],
  },
  {
    courseSlug: 'ux-design-course-2',
    courseName: 'Start the UX Design Process: Empathize, Define, and Ideate',
    programSlug: 'ux-design-professional-certificate-google',
    programTitle: 'UX Design Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Design', score: 40, specificSkills: ['Ideation', 'Sketching', 'Concept development', 'Brainstorming'] },
      { axis: 'Research', score: 30, specificSkills: ['User interviews', 'Empathy maps', 'Personas'] },
      { axis: 'Service', score: 20, specificSkills: ['Inclusive design', 'Accessibility awareness'] },
    ],
    onetSkillsAddressed: ['Originality', 'Fluency of Ideas', 'Visualization', 'Social Perceptiveness'],
    technologies: ['Figma', 'Miro', 'Whiteboarding tools'],
    softSkills: ['Empathy', 'Creativity', 'Collaboration'],
  },
  {
    courseSlug: 'ux-design-course-3',
    courseName: 'Build Wireframes and Low-Fidelity Prototypes',
    programSlug: 'ux-design-professional-certificate-google',
    programTitle: 'UX Design Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Design', score: 45, specificSkills: ['Wireframing', 'Prototyping', 'Layout design', 'Information architecture'] },
      { axis: 'Engineering', score: 15, specificSkills: ['Component thinking', 'Design systems basics'] },
    ],
    onetSkillsAddressed: ['Visualization', 'Flexibility of Closure', 'Spatial Orientation', 'Technology Design'],
    technologies: ['Figma', 'Wireframing tools', 'Prototyping tools'],
    softSkills: ['Attention to detail', 'Iterative thinking'],
  },
  {
    courseSlug: 'ux-design-course-4',
    courseName: 'Conduct UX Research and Test Early Concepts',
    programSlug: 'ux-design-professional-certificate-google',
    programTitle: 'UX Design Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Research', score: 40, specificSkills: ['Usability testing', 'Research planning', 'Data synthesis'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Quantitative research', 'Metrics analysis'] },
      { axis: 'Design', score: 20, specificSkills: ['Iterative design', 'Feedback integration'] },
    ],
    onetSkillsAddressed: ['Science', 'Inductive Reasoning', 'Deductive Reasoning', 'Active Listening'],
    technologies: ['Figma', 'User testing platforms', 'Survey tools'],
    softSkills: ['Open-mindedness', 'Objectivity'],
  },
  {
    courseSlug: 'ux-design-course-5',
    courseName: 'Create High-Fidelity Designs and Prototypes in Figma',
    programSlug: 'ux-design-professional-certificate-google',
    programTitle: 'UX Design Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Design', score: 50, specificSkills: ['Visual design', 'Typography', 'Color theory', 'UI design'] },
      { axis: 'Engineering', score: 20, specificSkills: ['Design systems', 'Component libraries', 'Auto-layout'] },
    ],
    onetSkillsAddressed: ['Fine Arts', 'Visualization', 'Perceptual Speed', 'Near Vision'],
    technologies: ['Figma', 'Design systems', 'Component libraries'],
    softSkills: ['Visual taste', 'Craftsmanship'],
  },
  {
    courseSlug: 'ux-design-course-6',
    courseName: 'Responsive Web Design in Adobe XD',
    programSlug: 'ux-design-professional-certificate-google',
    programTitle: 'UX Design Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Design', score: 45, specificSkills: ['Responsive design', 'Multi-platform design', 'Adaptive layouts'] },
      { axis: 'Engineering', score: 25, specificSkills: ['Design-dev handoff', 'Specs', 'Constraints'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Visualization', 'Flexibility of Closure'],
    technologies: ['Adobe XD', 'Figma', 'Responsive design tools'],
    softSkills: ['Platform thinking', 'Adaptability'],
  },
  {
    courseSlug: 'ux-design-course-7',
    courseName: 'Design a User Experience for Social Good & Prepare for Jobs',
    programSlug: 'ux-design-professional-certificate-google',
    programTitle: 'UX Design Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Design', score: 35, specificSkills: ['Portfolio design', 'Case study creation'] },
      { axis: 'Service', score: 30, specificSkills: ['Social impact design', 'Ethical considerations'] },
      { axis: 'Strategy', score: 25, specificSkills: ['Job preparation', 'Interview skills', 'Presentation'] },
    ],
    onetSkillsAddressed: ['Social Perceptiveness', 'Service Orientation', 'Speaking'],
    technologies: ['Figma', 'Portfolio platforms'],
    softSkills: ['Advocacy', 'Communication', 'Professionalism'],
  },
];

// ============================================================================
// SOFTWARE DEVELOPER (IBM)
// ============================================================================

const SOFTWARE_DEVELOPER_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'software-dev-course-1',
    courseName: 'Introduction to Software Engineering',
    programSlug: 'software-developer-professional-certificate-ibm',
    programTitle: 'Software Developer Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 25, specificSkills: ['Software lifecycle', 'Development process', 'Team collaboration'] },
      { axis: 'Strategy', score: 15, specificSkills: ['Project planning', 'Requirements gathering'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Complex Problem Solving', 'Coordination'],
    technologies: ['Git', 'GitHub'],
    softSkills: ['Collaboration', 'Process thinking'],
  },
  {
    courseSlug: 'software-dev-course-2',
    courseName: 'Introduction to HTML, CSS, & JavaScript',
    programSlug: 'software-developer-professional-certificate-ibm',
    programTitle: 'Software Developer Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 30, specificSkills: ['HTML', 'CSS', 'JavaScript basics', 'DOM manipulation'] },
      { axis: 'Design', score: 20, specificSkills: ['Web design basics', 'Layout', 'Styling'] },
    ],
    onetSkillsAddressed: ['Programming', 'Technology Design', 'Visualization'],
    technologies: ['HTML5', 'CSS3', 'JavaScript', 'VS Code'],
    softSkills: ['Attention to detail'],
  },
  {
    courseSlug: 'software-dev-course-3',
    courseName: 'Getting Started with Git and GitHub',
    programSlug: 'software-developer-professional-certificate-ibm',
    programTitle: 'Software Developer Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 25, specificSkills: ['Version control', 'Collaboration', 'Code review'] },
      { axis: 'Strategy', score: 20, specificSkills: ['Branching strategies', 'Release management'] },
    ],
    onetSkillsAddressed: ['Programming', 'Management of Material Resources'],
    technologies: ['Git', 'GitHub', 'CLI'],
    softSkills: ['Collaboration', 'Organization'],
  },
  {
    courseSlug: 'software-dev-course-4',
    courseName: 'Python for Data Science, AI & Development',
    programSlug: 'software-developer-professional-certificate-ibm',
    programTitle: 'Software Developer Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 35, specificSkills: ['Python programming', 'Data structures', 'Algorithms'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Data manipulation', 'Pandas basics'] },
    ],
    onetSkillsAddressed: ['Programming', 'Mathematics', 'Critical Thinking'],
    technologies: ['Python', 'Jupyter', 'Pandas', 'NumPy'],
    softSkills: ['Logical thinking'],
  },
  {
    courseSlug: 'software-dev-course-5',
    courseName: 'Developing Front-End Apps with React',
    programSlug: 'software-developer-professional-certificate-ibm',
    programTitle: 'Software Developer Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['React', 'Components', 'State management', 'Hooks'] },
      { axis: 'Design', score: 30, specificSkills: ['Component design', 'UI architecture', 'User interaction'] },
    ],
    onetSkillsAddressed: ['Programming', 'Technology Design', 'Originality'],
    technologies: ['React', 'JavaScript ES6', 'Redux', 'Node.js'],
    softSkills: ['User focus', 'Component thinking'],
  },
  {
    courseSlug: 'software-dev-course-6',
    courseName: 'Developing Back-End Apps with Node.js and Express',
    programSlug: 'software-developer-professional-certificate-ibm',
    programTitle: 'Software Developer Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Node.js', 'Express', 'REST APIs', 'Server-side'] },
      { axis: 'Analytics', score: 20, specificSkills: ['API design', 'Data flow'] },
    ],
    onetSkillsAddressed: ['Programming', 'Systems Analysis', 'Systems Evaluation'],
    technologies: ['Node.js', 'Express', 'REST APIs', 'JSON'],
    softSkills: ['Systems thinking'],
  },
  {
    courseSlug: 'software-dev-course-7',
    courseName: 'Django Application Development with SQL and Databases',
    programSlug: 'software-developer-professional-certificate-ibm',
    programTitle: 'Software Developer Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Django', 'Python web dev', 'MVC pattern'] },
      { axis: 'Analytics', score: 30, specificSkills: ['SQL', 'Database design', 'ORM'] },
    ],
    onetSkillsAddressed: ['Programming', 'Database Management', 'Systems Analysis'],
    technologies: ['Django', 'Python', 'SQL', 'PostgreSQL'],
    softSkills: ['Data modeling'],
  },
  {
    courseSlug: 'software-dev-course-8',
    courseName: 'Introduction to Containers w/ Docker, Kubernetes & OpenShift',
    programSlug: 'software-developer-professional-certificate-ibm',
    programTitle: 'Software Developer Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 50, specificSkills: ['Docker', 'Containers', 'Kubernetes', 'DevOps'] },
      { axis: 'Strategy', score: 25, specificSkills: ['Deployment strategies', 'Scalability'] },
    ],
    onetSkillsAddressed: ['Programming', 'Operations Analysis', 'Technology Design'],
    technologies: ['Docker', 'Kubernetes', 'OpenShift', 'YAML'],
    softSkills: ['Infrastructure thinking'],
  },
  {
    courseSlug: 'software-dev-course-9',
    courseName: 'Application Development using Microservices and Serverless',
    programSlug: 'software-developer-professional-certificate-ibm',
    programTitle: 'Software Developer Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Microservices', 'Serverless', 'Cloud native'] },
      { axis: 'Strategy', score: 30, specificSkills: ['Architecture decisions', 'System design'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Systems Evaluation', 'Complex Problem Solving'],
    technologies: ['Serverless', 'Cloud Functions', 'IBM Cloud'],
    softSkills: ['Architectural thinking'],
  },
];

// ============================================================================
// CYBERSECURITY (Google)
// ============================================================================

const CYBERSECURITY_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'cybersecurity-course-1',
    courseName: 'Foundations of Cybersecurity',
    programSlug: 'cybersecurity-professional-certificate-google',
    programTitle: 'Cybersecurity Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Service', score: 35, specificSkills: ['Security ethics', 'Privacy principles', 'CIA triad'] },
      { axis: 'Engineering', score: 20, specificSkills: ['Security concepts', 'Threat landscape'] },
    ],
    onetSkillsAddressed: ['Systems Evaluation', 'Judgment and Decision Making'],
    technologies: [],
    softSkills: ['Ethical thinking', 'Risk awareness'],
  },
  {
    courseSlug: 'cybersecurity-course-2',
    courseName: 'Play It Safe: Manage Security Risks',
    programSlug: 'cybersecurity-professional-certificate-google',
    programTitle: 'Cybersecurity Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 30, specificSkills: ['Risk assessment', 'Security frameworks', 'Compliance'] },
      { axis: 'Service', score: 30, specificSkills: ['Risk management ethics', 'Business impact'] },
    ],
    onetSkillsAddressed: ['Management of Material Resources', 'Systems Evaluation'],
    technologies: ['NIST', 'Security frameworks'],
    softSkills: ['Risk assessment', 'Business alignment'],
  },
  {
    courseSlug: 'cybersecurity-course-3',
    courseName: 'Connect and Protect: Networks and Network Security',
    programSlug: 'cybersecurity-professional-certificate-google',
    programTitle: 'Cybersecurity Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Network protocols', 'Network security', 'TCP/IP'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Traffic analysis', 'Anomaly detection'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Operations Analysis', 'Troubleshooting'],
    technologies: ['Wireshark', 'Network tools', 'TCP/IP'],
    softSkills: ['Detail orientation'],
  },
  {
    courseSlug: 'cybersecurity-course-4',
    courseName: 'Tools of the Trade: Linux and SQL',
    programSlug: 'cybersecurity-professional-certificate-google',
    programTitle: 'Cybersecurity Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Linux', 'Command line', 'SQL', 'System administration'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Log analysis', 'Query writing'] },
    ],
    onetSkillsAddressed: ['Programming', 'Equipment Maintenance', 'Operations Analysis'],
    technologies: ['Linux', 'Bash', 'SQL', 'CLI'],
    softSkills: ['Persistence', 'Technical depth'],
  },
  {
    courseSlug: 'cybersecurity-course-5',
    courseName: 'Assets, Threats, and Vulnerabilities',
    programSlug: 'cybersecurity-professional-certificate-google',
    programTitle: 'Cybersecurity Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 35, specificSkills: ['Threat analysis', 'Vulnerability assessment', 'Asset inventory'] },
      { axis: 'Strategy', score: 25, specificSkills: ['Threat prioritization', 'Mitigation planning'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Systems Evaluation', 'Critical Thinking'],
    technologies: ['Vulnerability scanners', 'Threat intel platforms'],
    softSkills: ['Analytical thinking', 'Proactive mindset'],
  },
  {
    courseSlug: 'cybersecurity-course-6',
    courseName: 'Sound the Alarm: Detection and Response',
    programSlug: 'cybersecurity-professional-certificate-google',
    programTitle: 'Cybersecurity Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['SIEM', 'Incident response', 'Detection systems'] },
      { axis: 'Analytics', score: 30, specificSkills: ['Log analysis', 'Pattern detection', 'Forensics basics'] },
    ],
    onetSkillsAddressed: ['Operations Analysis', 'Quality Control Analysis', 'Troubleshooting'],
    technologies: ['SIEM', 'Splunk', 'Chronicle', 'Packet analyzers'],
    softSkills: ['Calm under pressure', 'Investigative mindset'],
  },
  {
    courseSlug: 'cybersecurity-course-7',
    courseName: 'Automate Cybersecurity Tasks with Python',
    programSlug: 'cybersecurity-professional-certificate-google',
    programTitle: 'Cybersecurity Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Python', 'Automation', 'Scripting', 'APIs'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Data parsing', 'Automation logic'] },
    ],
    onetSkillsAddressed: ['Programming', 'Technology Design'],
    technologies: ['Python', 'APIs', 'Regex', 'Automation tools'],
    softSkills: ['Efficiency mindset'],
  },
  {
    courseSlug: 'cybersecurity-course-8',
    courseName: 'Put It to Work: Prepare for Cybersecurity Jobs',
    programSlug: 'cybersecurity-professional-certificate-google',
    programTitle: 'Cybersecurity Professional Certificate',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 30, specificSkills: ['Job preparation', 'Interview skills', 'Portfolio'] },
      { axis: 'Service', score: 25, specificSkills: ['Professional ethics', 'Industry standards'] },
    ],
    onetSkillsAddressed: ['Speaking', 'Social Perceptiveness'],
    technologies: [],
    softSkills: ['Professionalism', 'Communication'],
  },
];

// ============================================================================
// AI PROFESSIONAL DEVELOPER (IBM)
// ============================================================================

const AI_DEVELOPER_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'ai-dev-course-1',
    courseName: 'Introduction to Software Engineering',
    programSlug: 'ai-professional-developer-certificate-ibm',
    programTitle: 'AI and Software Developer',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 25, specificSkills: ['Software fundamentals', 'Development lifecycle'] },
      { axis: 'Strategy', score: 15, specificSkills: ['Project planning'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Complex Problem Solving'],
    technologies: ['Git'],
    softSkills: ['Process thinking'],
  },
  {
    courseSlug: 'ai-dev-course-2',
    courseName: 'Introduction to Artificial Intelligence (AI)',
    programSlug: 'ai-professional-developer-certificate-ibm',
    programTitle: 'AI and Software Developer',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 30, specificSkills: ['AI concepts', 'Machine learning basics', 'AI applications'] },
      { axis: 'Research', score: 20, specificSkills: ['AI research methods', 'Literature awareness'] },
    ],
    onetSkillsAddressed: ['Science', 'Active Learning', 'Critical Thinking'],
    technologies: ['AI platforms', 'Watson'],
    softSkills: ['Future-oriented thinking'],
  },
  {
    courseSlug: 'ai-dev-course-3',
    courseName: 'Generative AI: Introduction and Applications',
    programSlug: 'ai-professional-developer-certificate-ibm',
    programTitle: 'AI and Software Developer',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 35, specificSkills: ['Generative AI', 'LLMs', 'AI applications'] },
      { axis: 'Engineering', score: 25, specificSkills: ['AI integration', 'API usage'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Systems Analysis'],
    technologies: ['OpenAI API', 'LLMs', 'Gen AI tools'],
    softSkills: ['Innovation mindset'],
  },
  {
    courseSlug: 'ai-dev-course-4',
    courseName: 'Generative AI: Prompt Engineering Basics',
    programSlug: 'ai-professional-developer-certificate-ibm',
    programTitle: 'AI and Software Developer',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 30, specificSkills: ['Prompt engineering', 'Context design', 'Output optimization'] },
      { axis: 'Design', score: 25, specificSkills: ['Interaction design', 'UX for AI', 'Prompt crafting'] },
    ],
    onetSkillsAddressed: ['Fluency of Ideas', 'Originality', 'Written Expression'],
    technologies: ['LLMs', 'Prompt tools'],
    softSkills: ['Communication', 'Precision'],
  },
  {
    courseSlug: 'ai-dev-course-5',
    courseName: 'Python for Data Science, AI & Development',
    programSlug: 'ai-professional-developer-certificate-ibm',
    programTitle: 'AI and Software Developer',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 35, specificSkills: ['Python', 'Data structures', 'Programming'] },
      { axis: 'Analytics', score: 30, specificSkills: ['Data manipulation', 'NumPy', 'Pandas'] },
    ],
    onetSkillsAddressed: ['Programming', 'Mathematics'],
    technologies: ['Python', 'Jupyter', 'Pandas', 'NumPy'],
    softSkills: ['Logical thinking'],
  },
  {
    courseSlug: 'ai-dev-course-6',
    courseName: 'Developing AI Applications with Python and Flask',
    programSlug: 'ai-professional-developer-certificate-ibm',
    programTitle: 'AI and Software Developer',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Flask', 'Web apps', 'AI integration', 'APIs'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Model integration', 'Data flow'] },
    ],
    onetSkillsAddressed: ['Programming', 'Technology Design', 'Systems Analysis'],
    technologies: ['Python', 'Flask', 'REST APIs', 'AI libraries'],
    softSkills: ['Integration thinking'],
  },
  {
    courseSlug: 'ai-dev-course-7',
    courseName: 'Building Generative AI-Powered Applications with Python',
    programSlug: 'ai-professional-developer-certificate-ibm',
    programTitle: 'AI and Software Developer',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Gen AI apps', 'RAG', 'Vector databases', 'LangChain'] },
      { axis: 'Analytics', score: 30, specificSkills: ['Embeddings', 'Semantic search', 'Context management'] },
    ],
    onetSkillsAddressed: ['Programming', 'Systems Analysis', 'Technology Design'],
    technologies: ['Python', 'LangChain', 'Vector DBs', 'OpenAI API'],
    softSkills: ['Cutting-edge thinking'],
  },
  {
    courseSlug: 'ai-dev-course-8',
    courseName: 'Generative AI: Elevate your Software Development Career',
    programSlug: 'ai-professional-developer-certificate-ibm',
    programTitle: 'AI and Software Developer',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 30, specificSkills: ['AI career strategy', 'Portfolio building'] },
      { axis: 'Engineering', score: 25, specificSkills: ['AI-assisted coding', 'Productivity tools'] },
    ],
    onetSkillsAddressed: ['Management of Personnel Resources', 'Learning Strategies'],
    technologies: ['AI coding assistants', 'Dev tools'],
    softSkills: ['Adaptability', 'Continuous learning'],
  },
];

// ============================================================================
// DATA SCIENCE (IBM)
// ============================================================================

const DATA_SCIENCE_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'data-science-course-1',
    courseName: 'What is Data Science?',
    programSlug: 'data-science-professional-certificate-ibm',
    programTitle: 'Data Science Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Research', score: 25, specificSkills: ['Data science concepts', 'Research methodology'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Data thinking', 'Problem framing'] },
    ],
    onetSkillsAddressed: ['Science', 'Active Learning'],
    technologies: [],
    softSkills: ['Curiosity'],
  },
  {
    courseSlug: 'data-science-course-2',
    courseName: 'Tools for Data Science',
    programSlug: 'data-science-professional-certificate-ibm',
    programTitle: 'Data Science Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 30, specificSkills: ['Jupyter', 'RStudio', 'IDEs', 'Git'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Tool selection', 'Workflow design'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Equipment Selection'],
    technologies: ['Jupyter', 'RStudio', 'Git', 'Watson Studio'],
    softSkills: ['Tool fluency'],
  },
  {
    courseSlug: 'data-science-course-3',
    courseName: 'Data Science Methodology',
    programSlug: 'data-science-professional-certificate-ibm',
    programTitle: 'Data Science Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Research', score: 35, specificSkills: ['CRISP-DM', 'Research methodology', 'Scientific method'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Problem definition', 'Success metrics'] },
    ],
    onetSkillsAddressed: ['Science', 'Systems Analysis', 'Systems Evaluation'],
    technologies: [],
    softSkills: ['Methodical approach'],
  },
  {
    courseSlug: 'data-science-course-4',
    courseName: 'Python for Data Science, AI & Development',
    programSlug: 'data-science-professional-certificate-ibm',
    programTitle: 'Data Science Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 35, specificSkills: ['Python', 'Programming', 'Data structures'] },
      { axis: 'Analytics', score: 30, specificSkills: ['Data manipulation', 'Pandas basics'] },
    ],
    onetSkillsAddressed: ['Programming', 'Mathematics'],
    technologies: ['Python', 'Jupyter', 'Pandas'],
    softSkills: ['Coding fluency'],
  },
  {
    courseSlug: 'data-science-course-5',
    courseName: 'Python Project for Data Science',
    programSlug: 'data-science-professional-certificate-ibm',
    programTitle: 'Data Science Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 35, specificSkills: ['Applied analysis', 'Project execution'] },
      { axis: 'Engineering', score: 25, specificSkills: ['Code organization', 'Best practices'] },
    ],
    onetSkillsAddressed: ['Programming', 'Complex Problem Solving'],
    technologies: ['Python', 'APIs', 'Web scraping'],
    softSkills: ['Project completion'],
  },
  {
    courseSlug: 'data-science-course-6',
    courseName: 'Databases and SQL for Data Science with Python',
    programSlug: 'data-science-professional-certificate-ibm',
    programTitle: 'Data Science Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['SQL', 'Database design', 'Querying'] },
      { axis: 'Analytics', score: 30, specificSkills: ['Data extraction', 'Aggregation'] },
    ],
    onetSkillsAddressed: ['Programming', 'Database Management'],
    technologies: ['SQL', 'SQLite', 'Python DB-API'],
    softSkills: ['Query precision'],
  },
  {
    courseSlug: 'data-science-course-7',
    courseName: 'Data Analysis with Python',
    programSlug: 'data-science-professional-certificate-ibm',
    programTitle: 'Data Science Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 40, specificSkills: ['Statistical analysis', 'Pandas', 'NumPy', 'Data cleaning'] },
      { axis: 'Research', score: 20, specificSkills: ['Exploratory analysis', 'Hypothesis testing'] },
    ],
    onetSkillsAddressed: ['Mathematics', 'Science', 'Critical Thinking'],
    technologies: ['Python', 'Pandas', 'NumPy', 'SciPy'],
    softSkills: ['Statistical thinking'],
  },
  {
    courseSlug: 'data-science-course-8',
    courseName: 'Data Visualization with Python',
    programSlug: 'data-science-professional-certificate-ibm',
    programTitle: 'Data Science Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Design', score: 40, specificSkills: ['Matplotlib', 'Seaborn', 'Plotly', 'Visual storytelling'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Insight communication', 'Pattern visualization'] },
    ],
    onetSkillsAddressed: ['Visualization', 'Originality', 'Written Expression'],
    technologies: ['Python', 'Matplotlib', 'Seaborn', 'Plotly', 'Dash'],
    softSkills: ['Visual communication'],
  },
  {
    courseSlug: 'data-science-course-9',
    courseName: 'Machine Learning with Python',
    programSlug: 'data-science-professional-certificate-ibm',
    programTitle: 'Data Science Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 45, specificSkills: ['ML algorithms', 'Scikit-learn', 'Model evaluation'] },
      { axis: 'Research', score: 30, specificSkills: ['Feature engineering', 'Model selection'] },
      { axis: 'Engineering', score: 25, specificSkills: ['ML pipelines', 'Deployment basics'] },
    ],
    onetSkillsAddressed: ['Science', 'Mathematics', 'Programming', 'Systems Analysis'],
    technologies: ['Python', 'Scikit-learn', 'MLflow'],
    softSkills: ['Experimental mindset'],
  },
  {
    courseSlug: 'data-science-course-10',
    courseName: 'Applied Data Science Capstone',
    programSlug: 'data-science-professional-certificate-ibm',
    programTitle: 'Data Science Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 35, specificSkills: ['End-to-end project', 'Portfolio'] },
      { axis: 'Strategy', score: 25, specificSkills: ['Project management', 'Stakeholder communication'] },
      { axis: 'Engineering', score: 25, specificSkills: ['Integration', 'Best practices'] },
    ],
    onetSkillsAddressed: ['Complex Problem Solving', 'Time Management'],
    technologies: ['Python', 'SQL', 'ML tools', 'Cloud'],
    softSkills: ['Project ownership'],
  },
];

// ============================================================================
// IT SUPPORT (IBM)
// ============================================================================

const IT_SUPPORT_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'it-support-course-1',
    courseName: 'Introduction to Technical Support',
    programSlug: 'it-support-professional-certificate-ibm',
    programTitle: 'IT Support Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Service', score: 30, specificSkills: ['Customer service', 'Professionalism', 'Communication'] },
      { axis: 'Strategy', score: 15, specificSkills: ['Support process', 'Ticket management'] },
    ],
    onetSkillsAddressed: ['Service Orientation', 'Social Perceptiveness', 'Speaking'],
    technologies: ['Ticketing systems'],
    softSkills: ['Customer focus'],
  },
  {
    courseSlug: 'it-support-course-2',
    courseName: 'Introduction to Hardware and Operating Systems',
    programSlug: 'it-support-professional-certificate-ibm',
    programTitle: 'IT Support Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 35, specificSkills: ['Hardware', 'OS fundamentals', 'Installation'] },
      { axis: 'Analytics', score: 15, specificSkills: ['Diagnostic thinking'] },
    ],
    onetSkillsAddressed: ['Equipment Maintenance', 'Installation', 'Troubleshooting'],
    technologies: ['Windows', 'Linux', 'Hardware'],
    softSkills: ['Hands-on aptitude'],
  },
  {
    courseSlug: 'it-support-course-3',
    courseName: 'Introduction to Software, Programming, and Databases',
    programSlug: 'it-support-professional-certificate-ibm',
    programTitle: 'IT Support Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 30, specificSkills: ['Software basics', 'Programming intro', 'Database concepts'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Logical thinking', 'Query basics'] },
    ],
    onetSkillsAddressed: ['Programming', 'Database Management'],
    technologies: ['SQL', 'Python basics', 'Databases'],
    softSkills: ['Technical curiosity'],
  },
  {
    courseSlug: 'it-support-course-4',
    courseName: 'Introduction to Networking and Storage',
    programSlug: 'it-support-professional-certificate-ibm',
    programTitle: 'IT Support Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Networking', 'TCP/IP', 'Storage', 'Cloud basics'] },
      { axis: 'Analytics', score: 15, specificSkills: ['Network troubleshooting'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Operations Analysis', 'Troubleshooting'],
    technologies: ['Networking tools', 'Cloud platforms'],
    softSkills: ['Systems thinking'],
  },
  {
    courseSlug: 'it-support-course-5',
    courseName: 'Introduction to Cybersecurity Essentials',
    programSlug: 'it-support-professional-certificate-ibm',
    programTitle: 'IT Support Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Service', score: 35, specificSkills: ['Security awareness', 'Privacy', 'Best practices'] },
      { axis: 'Engineering', score: 25, specificSkills: ['Security tools', 'Threat basics'] },
    ],
    onetSkillsAddressed: ['Systems Evaluation', 'Judgment and Decision Making'],
    technologies: ['Security tools', 'Antivirus'],
    softSkills: ['Security mindset'],
  },
  {
    courseSlug: 'it-support-course-6',
    courseName: 'Introduction to Cloud Computing',
    programSlug: 'it-support-professional-certificate-ibm',
    programTitle: 'IT Support Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 35, specificSkills: ['Cloud concepts', 'AWS/Azure/IBM Cloud', 'Virtualization'] },
      { axis: 'Strategy', score: 20, specificSkills: ['Cloud strategy', 'Migration basics'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Systems Analysis'],
    technologies: ['AWS', 'Azure', 'IBM Cloud', 'Containers'],
    softSkills: ['Modern infrastructure thinking'],
  },
  {
    courseSlug: 'it-support-course-7',
    courseName: 'Technical Support Case Studies and Capstone Project',
    programSlug: 'it-support-professional-certificate-ibm',
    programTitle: 'IT Support Professional Certificate',
    partner: 'IBM',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 30, specificSkills: ['Troubleshooting', 'Case resolution'] },
      { axis: 'Service', score: 25, specificSkills: ['Professionalism', 'Customer satisfaction'] },
      { axis: 'Strategy', score: 20, specificSkills: ['Project completion', 'Portfolio'] },
    ],
    onetSkillsAddressed: ['Complex Problem Solving', 'Service Orientation'],
    technologies: ['All previous'],
    softSkills: ['Professional readiness'],
  },
];

// ============================================================================
// PROJECT MANAGEMENT (Microsoft)
// ============================================================================

const PROJECT_MANAGEMENT_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'pm-course-1',
    courseName: 'Project Management Foundations',
    programSlug: 'project-management-professional-certificate-microsoft',
    programTitle: 'Project Management Professional Certificate',
    partner: 'Microsoft',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 35, specificSkills: ['PM fundamentals', 'Lifecycle', 'Methodologies'] },
      { axis: 'Service', score: 20, specificSkills: ['Professionalism', 'Ethics in PM'] },
    ],
    onetSkillsAddressed: ['Management of Material Resources', 'Coordination'],
    technologies: ['MS Project', 'Excel'],
    softSkills: ['Leadership foundation'],
  },
  {
    courseSlug: 'pm-course-2',
    courseName: 'Initiating and Planning Projects',
    programSlug: 'project-management-professional-certificate-microsoft',
    programTitle: 'Project Management Professional Certificate',
    partner: 'Microsoft',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 40, specificSkills: ['Project charter', 'Stakeholder analysis', 'Scope definition'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Feasibility analysis', 'Risk identification'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Complex Problem Solving', 'Judgment and Decision Making'],
    technologies: ['MS Project', 'Planning tools'],
    softSkills: ['Strategic thinking'],
  },
  {
    courseSlug: 'pm-course-3',
    courseName: 'Project Scheduling and Cost Management',
    programSlug: 'project-management-professional-certificate-microsoft',
    programTitle: 'Project Management Professional Certificate',
    partner: 'Microsoft',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 40, specificSkills: ['Scheduling', 'Critical path', 'Budgeting', 'Cost control'] },
      { axis: 'Strategy', score: 30, specificSkills: ['Resource allocation', 'Timeline management'] },
    ],
    onetSkillsAddressed: ['Mathematics', 'Management of Material Resources', 'Time Management'],
    technologies: ['MS Project', 'Excel', 'Scheduling tools'],
    softSkills: ['Numerical fluency'],
  },
  {
    courseSlug: 'pm-course-4',
    courseName: 'Managing Project Risks, Changes and Stakeholders',
    programSlug: 'project-management-professional-certificate-microsoft',
    programTitle: 'Project Management Professional Certificate',
    partner: 'Microsoft',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 40, specificSkills: ['Risk management', 'Change control', 'Stakeholder engagement'] },
      { axis: 'Service', score: 25, specificSkills: ['Negotiation', 'Conflict resolution'] },
    ],
    onetSkillsAddressed: ['Negotiation', 'Persuasion', 'Social Perceptiveness'],
    technologies: ['Risk registers', 'Collaboration tools'],
    softSkills: ['Diplomacy', 'Resilience'],
  },
  {
    courseSlug: 'pm-course-5',
    courseName: 'Project Leadership, Communication and Stakeholder Management',
    programSlug: 'project-management-professional-certificate-microsoft',
    programTitle: 'Project Management Professional Certificate',
    partner: 'Microsoft',
    estimatedHours: 10,
    contributions: [
      { axis: 'Service', score: 40, specificSkills: ['Leadership', 'Communication', 'Team motivation'] },
      { axis: 'Strategy', score: 35, specificSkills: ['Influence', 'Executive presence'] },
    ],
    onetSkillsAddressed: ['Management of Personnel Resources', 'Speaking', 'Social Perceptiveness'],
    technologies: ['Collaboration tools', 'Presentation tools'],
    softSkills: ['Leadership', 'Influence'],
  },
  {
    courseSlug: 'pm-course-6',
    courseName: 'Agile Project Management',
    programSlug: 'project-management-professional-certificate-microsoft',
    programTitle: 'Project Management Professional Certificate',
    partner: 'Microsoft',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 35, specificSkills: ['Agile', 'Scrum', 'Sprint planning', 'Adaptive planning'] },
      { axis: 'Service', score: 25, specificSkills: ['Team empowerment', 'Servant leadership'] },
    ],
    onetSkillsAddressed: ['Management of Personnel Resources', 'Coordination'],
    technologies: ['Azure DevOps', 'Jira', 'Scrum boards'],
    softSkills: ['Adaptability', 'Facilitation'],
  },
  {
    courseSlug: 'pm-course-7',
    courseName: 'Microsoft Project & Power BI for Project Managers',
    programSlug: 'project-management-professional-certificate-microsoft',
    programTitle: 'Project Management Professional Certificate',
    partner: 'Microsoft',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['MS Project', 'Power BI', 'Dashboards', 'Reporting'] },
      { axis: 'Analytics', score: 35, specificSkills: ['Data visualization', 'KPI tracking', 'Insights'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Operations Analysis', 'Visualization'],
    technologies: ['Microsoft Project', 'Power BI', 'Excel', 'SharePoint'],
    softSkills: ['Data-driven leadership'],
  },
  {
    courseSlug: 'pm-course-8',
    courseName: 'Project Management Capstone',
    programSlug: 'project-management-professional-certificate-microsoft',
    programTitle: 'Project Management Professional Certificate',
    partner: 'Microsoft',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 35, specificSkills: ['End-to-end PM', 'Integration'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Performance analysis', 'Lessons learned'] },
      { axis: 'Service', score: 20, specificSkills: ['Professional reflection'] },
    ],
    onetSkillsAddressed: ['Complex Problem Solving', 'Systems Evaluation'],
    technologies: ['All previous'],
    softSkills: ['Professional maturity'],
  },
];

// ============================================================================
// DIGITAL MARKETING (Google)
// ============================================================================

const DIGITAL_MARKETING_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'marketing-course-1',
    courseName: 'Foundations of Digital Marketing and E-commerce',
    programSlug: 'digital-marketing-e-commerce-google',
    programTitle: 'Digital Marketing & E-Commerce',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 30, specificSkills: ['Marketing fundamentals', 'Funnel concepts', 'Customer journey'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Marketing metrics', 'KPI basics'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Judgment and Decision Making'],
    technologies: ['Google Analytics', 'Marketing platforms'],
    softSkills: ['Marketing mindset'],
  },
  {
    courseSlug: 'marketing-course-2',
    courseName: 'Attract and Engage Customers with Digital Marketing',
    programSlug: 'digital-marketing-e-commerce-google',
    programTitle: 'Digital Marketing & E-Commerce',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Design', score: 30, specificSkills: ['Content creation', 'Visual marketing', 'Brand voice'] },
      { axis: 'Strategy', score: 25, specificSkills: ['SEO basics', 'Content strategy'] },
    ],
    onetSkillsAddressed: ['Originality', 'Written Expression', 'Fluency of Ideas'],
    technologies: ['SEO tools', 'Content platforms'],
    softSkills: ['Creativity'],
  },
  {
    courseSlug: 'marketing-course-3',
    courseName: 'From Likes to Leads: Interact with Customers Online',
    programSlug: 'digital-marketing-e-commerce-google',
    programTitle: 'Digital Marketing & E-Commerce',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Service', score: 30, specificSkills: ['Community management', 'Customer engagement', 'Social listening'] },
      { axis: 'Strategy', score: 25, specificSkills: ['Social strategy', 'Influencer basics'] },
    ],
    onetSkillsAddressed: ['Social Perceptiveness', 'Service Orientation', 'Speaking'],
    technologies: ['Social platforms', 'Hootsuite', 'Buffer'],
    softSkills: ['Empathy', 'Communication'],
  },
  {
    courseSlug: 'marketing-course-4',
    courseName: 'Think Outside the Inbox: Email Marketing',
    programSlug: 'digital-marketing-e-commerce-google',
    programTitle: 'Digital Marketing & E-Commerce',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Design', score: 25, specificSkills: ['Email design', 'Copywriting', 'Visual hierarchy'] },
      { axis: 'Analytics', score: 30, specificSkills: ['Email metrics', 'A/B testing', 'Segmentation'] },
    ],
    onetSkillsAddressed: ['Written Expression', 'Mathematics', 'Critical Thinking'],
    technologies: ['Email platforms', 'CRM', 'Analytics'],
    softSkills: ['Persuasion'],
  },
  {
    courseSlug: 'marketing-course-5',
    courseName: 'Assess for Success: Marketing Analytics and Measurement',
    programSlug: 'digital-marketing-e-commerce-google',
    programTitle: 'Digital Marketing & E-Commerce',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 45, specificSkills: ['Marketing analytics', 'Attribution', 'ROI analysis'] },
      { axis: 'Strategy', score: 30, specificSkills: ['Data-driven decisions', 'Performance optimization'] },
    ],
    onetSkillsAddressed: ['Mathematics', 'Systems Evaluation', 'Inductive Reasoning'],
    technologies: ['Google Analytics', 'Data Studio', 'Excel'],
    softSkills: ['Analytical thinking'],
  },
  {
    courseSlug: 'marketing-course-6',
    courseName: 'Make the Sale: Build, Launch, and Manage E-commerce Stores',
    programSlug: 'digital-marketing-e-commerce-google',
    programTitle: 'Digital Marketing & E-Commerce',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 35, specificSkills: ['E-commerce platforms', 'Store setup', 'Payment systems'] },
      { axis: 'Strategy', score: 30, specificSkills: ['Conversion optimization', 'Sales strategy'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Operations Analysis'],
    technologies: ['Shopify', 'WooCommerce', 'Payment gateways'],
    softSkills: ['Sales mindset'],
  },
  {
    courseSlug: 'marketing-course-7',
    courseName: 'Satisfaction Guaranteed: Develop Customer Loyalty Online',
    programSlug: 'digital-marketing-e-commerce-google',
    programTitle: 'Digital Marketing & E-Commerce',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Service', score: 35, specificSkills: ['Customer retention', 'Loyalty programs', 'Service excellence'] },
      { axis: 'Strategy', score: 25, specificSkills: ['CRM strategy', 'Lifecycle marketing'] },
    ],
    onetSkillsAddressed: ['Service Orientation', 'Social Perceptiveness'],
    technologies: ['CRM', 'Email automation'],
    softSkills: ['Customer advocacy'],
  },
];

// ============================================================================
// AWS CLOUD TECHNOLOGY
// ============================================================================

const AWS_CLOUD_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'aws-course-1',
    courseName: 'Introduction to Information Technology and AWS Cloud',
    programSlug: 'aws-cloud-technology-amazon',
    programTitle: 'AWS Cloud Technology',
    partner: 'Amazon Web Services',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 30, specificSkills: ['Cloud concepts', 'AWS basics', 'IT fundamentals'] },
      { axis: 'Strategy', score: 15, specificSkills: ['Cloud strategy', 'Migration basics'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Systems Analysis'],
    technologies: ['AWS Console', 'EC2', 'S3'],
    softSkills: ['Cloud mindset'],
  },
  {
    courseSlug: 'aws-course-2',
    courseName: 'Providing Technical Support for AWS Workloads',
    programSlug: 'aws-cloud-technology-amazon',
    programTitle: 'AWS Cloud Technology',
    partner: 'Amazon Web Services',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['AWS support', 'Troubleshooting', 'Incident response'] },
      { axis: 'Service', score: 20, specificSkills: ['Customer support', 'SLA awareness'] },
    ],
    onetSkillsAddressed: ['Operations Analysis', 'Troubleshooting', 'Service Orientation'],
    technologies: ['AWS Support', 'CloudWatch', 'CloudTrail'],
    softSkills: ['Support excellence'],
  },
  {
    courseSlug: 'aws-course-3',
    courseName: 'Developing Applications in Python on AWS',
    programSlug: 'aws-cloud-technology-amazon',
    programTitle: 'AWS Cloud Technology',
    partner: 'Amazon Web Services',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Python', 'AWS SDK', 'Lambda', 'API Gateway'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Application design', 'Integration patterns'] },
    ],
    onetSkillsAddressed: ['Programming', 'Technology Design', 'Systems Analysis'],
    technologies: ['Python', 'Boto3', 'AWS Lambda', 'API Gateway', 'DynamoDB'],
    softSkills: ['Development thinking'],
  },
  {
    courseSlug: 'aws-course-4',
    courseName: 'Skills for Working as an AWS Cloud Consultant',
    programSlug: 'aws-cloud-technology-amazon',
    programTitle: 'AWS Cloud Technology',
    partner: 'Amazon Web Services',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 40, specificSkills: ['Consulting', 'Client management', 'Solution design'] },
      { axis: 'Service', score: 25, specificSkills: ['Professionalism', 'Client trust'] },
    ],
    onetSkillsAddressed: ['Management of Material Resources', 'Social Perceptiveness', 'Speaking'],
    technologies: ['AWS Well-Architected', 'Solution architecture tools'],
    softSkills: ['Consulting mindset'],
  },
  {
    courseSlug: 'aws-course-5',
    courseName: 'DevOps on AWS and Project Management',
    programSlug: 'aws-cloud-technology-amazon',
    programTitle: 'AWS Cloud Technology',
    partner: 'Amazon Web Services',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['DevOps', 'CI/CD', 'CodePipeline', 'CloudFormation'] },
      { axis: 'Strategy', score: 30, specificSkills: ['DevOps culture', 'Project management'] },
    ],
    onetSkillsAddressed: ['Programming', 'Management of Material Resources', 'Coordination'],
    technologies: ['CodePipeline', 'CloudFormation', 'CodeBuild', 'CodeDeploy'],
    softSkills: ['Collaboration'],
  },
  {
    courseSlug: 'aws-course-6',
    courseName: 'Automation in the AWS Cloud',
    programSlug: 'aws-cloud-technology-amazon',
    programTitle: 'AWS Cloud Technology',
    partner: 'Amazon Web Services',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 50, specificSkills: ['Automation', 'Infrastructure as Code', 'Systems Manager'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Process optimization', 'Efficiency analysis'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Operations Analysis'],
    technologies: ['Systems Manager', 'CloudFormation', 'AWS Config'],
    softSkills: ['Efficiency focus'],
  },
  {
    courseSlug: 'aws-course-7',
    courseName: 'Data Analytics and Databases on AWS',
    programSlug: 'aws-cloud-technology-amazon',
    programTitle: 'AWS Cloud Technology',
    partner: 'Amazon Web Services',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 45, specificSkills: ['AWS analytics', 'Redshift', 'Athena', 'Data lakes'] },
      { axis: 'Engineering', score: 35, specificSkills: ['Database design', 'RDS', 'DynamoDB'] },
    ],
    onetSkillsAddressed: ['Database Management', 'Systems Analysis', 'Mathematics'],
    technologies: ['Redshift', 'Athena', 'RDS', 'DynamoDB', 'S3', 'Glue'],
    softSkills: ['Data architecture thinking'],
  },
  {
    courseSlug: 'aws-course-8',
    courseName: 'Capstone: Following the AWS Well Architected Framework',
    programSlug: 'aws-cloud-technology-amazon',
    programTitle: 'AWS Cloud Technology',
    partner: 'Amazon Web Services',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Architecture', 'Best practices', 'Security'] },
      { axis: 'Strategy', score: 30, specificSkills: ['Solution design', 'Cost optimization'] },
      { axis: 'Service', score: 20, specificSkills: ['Security', 'Compliance'] },
    ],
    onetSkillsAddressed: ['Systems Evaluation', 'Complex Problem Solving', 'Judgment and Decision Making'],
    technologies: ['AWS Well-Architected Tool', 'Full AWS stack'],
    softSkills: ['Architectural thinking'],
  },
];

// ============================================================================
// COMPTIA A+
// ============================================================================

const COMPTIA_A_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'comptia-a-course-1',
    courseName: 'IT Fundamentals and Hardware Essentials',
    programSlug: 'comptia-a-professional-certificate',
    programTitle: 'CompTIA A+',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 35, specificSkills: ['Hardware', 'Components', 'Installation'] },
      { axis: 'Analytics', score: 15, specificSkills: ['Diagnostic basics'] },
    ],
    onetSkillsAddressed: ['Equipment Maintenance', 'Installation'],
    technologies: ['PC hardware', 'Mobile devices'],
    softSkills: ['Hands-on aptitude'],
  },
  {
    courseSlug: 'comptia-a-course-2',
    courseName: 'Networking, Peripherals, and Wireless Technologies',
    programSlug: 'comptia-a-professional-certificate',
    programTitle: 'CompTIA A+',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Networking', 'Wireless', 'Peripherals', 'TCP/IP'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Network troubleshooting'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Troubleshooting', 'Operations Analysis'],
    technologies: ['Networking tools', 'Wireless standards'],
    softSkills: ['Technical breadth'],
  },
  {
    courseSlug: 'comptia-a-course-3',
    courseName: 'Advanced Networking, Virtualization, and IT Security',
    programSlug: 'comptia-a-professional-certificate',
    programTitle: 'CompTIA A+',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Virtualization', 'Security basics', 'Advanced networking'] },
      { axis: 'Service', score: 25, specificSkills: ['Security awareness', 'Best practices'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Systems Evaluation'],
    technologies: ['Virtualization', 'Security tools'],
    softSkills: ['Security mindset'],
  },
  {
    courseSlug: 'comptia-a-course-4',
    courseName: 'Foundations of Computer Hardware and Storage',
    programSlug: 'comptia-a-professional-certificate',
    programTitle: 'CompTIA A+',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Hardware deep dive', 'Storage', 'Motherboards'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Performance analysis'] },
    ],
    onetSkillsAddressed: ['Equipment Maintenance', 'Quality Control Analysis'],
    technologies: ['Hardware diagnostics', 'Storage technologies'],
    softSkills: ['Technical depth'],
  },
  {
    courseSlug: 'comptia-a-course-5',
    courseName: 'Operating Systems and Networking Fundamentals',
    programSlug: 'comptia-a-professional-certificate',
    programTitle: 'CompTIA A+',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Windows', 'Linux', 'MacOS', 'OS fundamentals'] },
      { axis: 'Analytics', score: 20, specificSkills: ['System troubleshooting'] },
    ],
    onetSkillsAddressed: ['Troubleshooting', 'Technology Design'],
    technologies: ['Windows', 'Linux', 'Command line'],
    softSkills: ['OS fluency'],
  },
  {
    courseSlug: 'comptia-a-course-6',
    courseName: 'Advanced Networking, Security, and IT Operations',
    programSlug: 'comptia-a-professional-certificate',
    programTitle: 'CompTIA A+',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Advanced networking', 'Security', 'Operations'] },
      { axis: 'Service', score: 25, specificSkills: ['Security protocols', 'Compliance'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Systems Evaluation', 'Operations Monitoring'],
    technologies: ['Security tools', 'Network protocols'],
    softSkills: ['Operational excellence'],
  },
  {
    courseSlug: 'comptia-a-course-7',
    courseName: 'Practice Exams for CompTIA A+ Core 1 & Core 2',
    programSlug: 'comptia-a-professional-certificate',
    programTitle: 'CompTIA A+',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 30, specificSkills: ['Exam strategy', 'Knowledge synthesis'] },
      { axis: 'Strategy', score: 25, specificSkills: ['Test-taking', 'Time management'] },
    ],
    onetSkillsAddressed: ['Learning Strategies', 'Time Management'],
    technologies: ['Exam simulators'],
    softSkills: ['Exam readiness'],
  },
];

// ============================================================================
// COMPTIA NETWORK+
// ============================================================================

const COMPTIA_NETWORK_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'comptia-network-course-1',
    courseName: 'Introduction to Networking',
    programSlug: 'comptia-network-professional-certificate',
    programTitle: 'CompTIA Network+ Professional Certificate',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 30, specificSkills: ['Networking basics', 'OSI model', 'Protocols'] },
      { axis: 'Analytics', score: 15, specificSkills: ['Network concepts'] },
    ],
    onetSkillsAddressed: ['Technology Design'],
    technologies: ['Network simulators'],
    softSkills: ['Foundation building'],
  },
  {
    courseSlug: 'comptia-network-course-2',
    courseName: 'Networking Fundamentals',
    programSlug: 'comptia-network-professional-certificate',
    programTitle: 'CompTIA Network+ Professional Certificate',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 35, specificSkills: ['TCP/IP', 'Subnetting', 'Addressing'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Network math', 'Binary/hex'] },
    ],
    onetSkillsAddressed: ['Mathematics', 'Technology Design'],
    technologies: ['Packet tracer', 'Network tools'],
    softSkills: ['Numerical fluency'],
  },
  {
    courseSlug: 'comptia-network-course-3',
    courseName: 'Introduction to Contemporary Operating Systems and Hardware',
    programSlug: 'comptia-network-professional-certificate',
    programTitle: 'CompTIA Network+ Professional Certificate',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 35, specificSkills: ['OS integration', 'Hardware networking'] },
      { axis: 'Analytics', score: 20, specificSkills: ['System integration'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Equipment Maintenance'],
    technologies: ['Windows', 'Linux', 'Network hardware'],
    softSkills: ['Integration thinking'],
  },
  {
    courseSlug: 'comptia-network-course-4',
    courseName: 'Introduction to Networking and Storage',
    programSlug: 'comptia-network-professional-certificate',
    programTitle: 'CompTIA Network+ Professional Certificate',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Storage networking', 'NAS', 'SAN', 'Cloud storage'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Capacity planning'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Operations Analysis'],
    technologies: ['Storage protocols', 'Network storage'],
    softSkills: ['Storage thinking'],
  },
  {
    courseSlug: 'comptia-network-course-5',
    courseName: 'Basics of Cisco Networking',
    programSlug: 'comptia-network-professional-certificate',
    programTitle: 'CompTIA Network+ Professional Certificate',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Cisco IOS', 'Routing', 'Switching', 'CLI'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Network design'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Operations Analysis'],
    technologies: ['Cisco Packet Tracer', 'IOS', 'GNS3'],
    softSkills: ['Vendor expertise'],
  },
  {
    courseSlug: 'comptia-network-course-6',
    courseName: 'CCNA Foundations',
    programSlug: 'comptia-network-professional-certificate',
    programTitle: 'CompTIA Network+ Professional Certificate',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 50, specificSkills: ['Advanced routing', 'VLANs', 'ACLs', 'WAN'] },
      { axis: 'Strategy', score: 20, specificSkills: ['Network architecture'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Systems Evaluation', 'Complex Problem Solving'],
    technologies: ['Cisco', 'Enterprise networking'],
    softSkills: ['Enterprise thinking'],
  },
  {
    courseSlug: 'comptia-network-course-7',
    courseName: 'TCP/IP and Advanced Topics',
    programSlug: 'comptia-network-professional-certificate',
    programTitle: 'CompTIA Network+ Professional Certificate',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 50, specificSkills: ['TCP/IP deep dive', 'Advanced protocols', 'Troubleshooting'] },
      { axis: 'Analytics', score: 30, specificSkills: ['Packet analysis', 'Protocol debugging'] },
    ],
    onetSkillsAddressed: ['Operations Analysis', 'Troubleshooting', 'Technology Design'],
    technologies: ['Wireshark', 'Protocol analyzers'],
    softSkills: ['Deep technical expertise'],
  },
  {
    courseSlug: 'comptia-network-course-8',
    courseName: 'Operating Systems and Networking Fundamentals',
    programSlug: 'comptia-network-professional-certificate',
    programTitle: 'CompTIA Network+ Professional Certificate',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['OS networking', 'Services', 'Integration'] },
      { axis: 'Analytics', score: 20, specificSkills: ['System troubleshooting'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Troubleshooting'],
    technologies: ['Windows Server', 'Linux networking'],
    softSkills: ['OS networking fluency'],
  },
  {
    courseSlug: 'comptia-network-course-9',
    courseName: 'Network Foundations and Addressing',
    programSlug: 'comptia-network-professional-certificate',
    programTitle: 'CompTIA Network+ Professional Certificate',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Network design', 'IP addressing', 'Subnetting mastery'] },
      { axis: 'Analytics', score: 30, specificSkills: ['Address planning', 'Network math'] },
    ],
    onetSkillsAddressed: ['Mathematics', 'Technology Design', 'Systems Analysis'],
    technologies: ['IPAM', 'Network calculators'],
    softSkills: ['Addressing mastery'],
  },
];

// ============================================================================
// COMPTIA SECURITY+
// ============================================================================

const COMPTIA_SECURITY_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'comptia-security-course-1',
    courseName: 'Network Security Fundamentals',
    programSlug: 'comptia-security-professional-certificate',
    programTitle: 'CompTIA Security+ Professional Certificate',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Network security', 'Firewalls', 'VPNs'] },
      { axis: 'Service', score: 30, specificSkills: ['Security ethics', 'Defense mindset'] },
    ],
    onetSkillsAddressed: ['Systems Evaluation', 'Technology Design'],
    technologies: ['Firewalls', 'VPNs', 'Network security tools'],
    softSkills: ['Security-first thinking'],
  },
  {
    courseSlug: 'comptia-security-course-2',
    courseName: 'Security Threats and Vulnerabilities',
    programSlug: 'comptia-security-professional-certificate',
    programTitle: 'CompTIA Security+ Professional Certificate',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 35, specificSkills: ['Security fundamentals', 'Threats', 'Vulnerabilities'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Risk assessment'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Judgment and Decision Making'],
    technologies: ['Security scanners', 'Assessment tools'],
    softSkills: ['Risk awareness'],
  },
  {
    courseSlug: 'comptia-security-course-3',
    courseName: 'System Hardening and Endpoint Security',
    programSlug: 'comptia-security-professional-certificate',
    programTitle: 'CompTIA Security+ Professional Certificate',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['System hardening', 'Endpoint security', 'Network defense'] },
      { axis: 'Service', score: 30, specificSkills: ['Security policies', 'Compliance'] },
    ],
    onetSkillsAddressed: ['Systems Evaluation', 'Operations Analysis'],
    technologies: ['Endpoint protection', 'SIEM basics'],
    softSkills: ['Defense expertise'],
  },
  {
    courseSlug: 'comptia-security-course-4',
    courseName: 'Cryptography and Secure Communications',
    programSlug: 'comptia-security-professional-certificate',
    programTitle: 'CompTIA Security+ Professional Certificate',
    partner: 'CompTIA',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Network protocols', 'Secure communications', 'Cryptography'] },
      { axis: 'Analytics', score: 30, specificSkills: ['Traffic analysis', 'Anomaly detection'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Operations Analysis', 'Mathematics'],
    technologies: ['Wireshark', 'Cryptography tools', 'Network analyzers'],
    softSkills: ['Protocol expertise'],
  },
];

// ============================================================================
// IT AUTOMATION WITH PYTHON (Google)
// ============================================================================

const IT_AUTOMATION_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'it-auto-course-1',
    courseName: 'Crash Course on Python',
    programSlug: 'it-automation-with-python-google',
    programTitle: 'IT Automation with Python',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 35, specificSkills: ['Python basics', 'Programming', 'Scripting'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Logic', 'Problem solving'] },
    ],
    onetSkillsAddressed: ['Programming', 'Critical Thinking'],
    technologies: ['Python', 'IDLE', 'VS Code'],
    softSkills: ['Coding mindset'],
  },
  {
    courseSlug: 'it-auto-course-2',
    courseName: 'Using Python to Interact with the Operating System',
    programSlug: 'it-automation-with-python-google',
    programTitle: 'IT Automation with Python',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['OS interaction', 'File systems', 'Processes', 'Python scripting'] },
      { axis: 'Analytics', score: 25, specificSkills: ['System analysis', 'Log parsing'] },
    ],
    onetSkillsAddressed: ['Programming', 'Systems Analysis', 'Operations Analysis'],
    technologies: ['Python', 'Bash', 'Linux', 'Windows'],
    softSkills: ['System thinking'],
  },
  {
    courseSlug: 'it-auto-course-3',
    courseName: 'Introduction to Git and GitHub',
    programSlug: 'it-automation-with-python-google',
    programTitle: 'IT Automation with Python',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 35, specificSkills: ['Version control', 'Collaboration', 'Code review'] },
      { axis: 'Strategy', score: 20, specificSkills: ['Branching strategies', 'Release management'] },
    ],
    onetSkillsAddressed: ['Programming', 'Management of Material Resources'],
    technologies: ['Git', 'GitHub', 'GitLab'],
    softSkills: ['Collaboration'],
  },
  {
    courseSlug: 'it-auto-course-4',
    courseName: 'Troubleshooting and Debugging Techniques',
    programSlug: 'it-automation-with-python-google',
    programTitle: 'IT Automation with Python',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Debugging', 'Troubleshooting', 'Problem isolation'] },
      { axis: 'Analytics', score: 35, specificSkills: ['Root cause analysis', 'Systematic debugging'] },
    ],
    onetSkillsAddressed: ['Troubleshooting', 'Operations Analysis', 'Quality Control Analysis'],
    technologies: ['Python', 'Debuggers', 'Logging'],
    softSkills: ['Persistence', 'Analytical thinking'],
  },
  {
    courseSlug: 'it-auto-course-5',
    courseName: 'Configuration Management and the Cloud',
    programSlug: 'it-automation-with-python-google',
    programTitle: 'IT Automation with Python',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Puppet', 'Cloud', 'Automation', 'Infrastructure as Code'] },
      { axis: 'Strategy', score: 25, specificSkills: ['Scalability', 'Cloud strategy'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Systems Analysis', 'Management of Material Resources'],
    technologies: ['Puppet', 'AWS', 'GCP', 'Azure'],
    softSkills: ['Infrastructure thinking'],
  },
  {
    courseSlug: 'it-auto-course-6',
    courseName: 'Automating Real-World Tasks with Python',
    programSlug: 'it-automation-with-python-google',
    programTitle: 'IT Automation with Python',
    partner: 'Google',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 50, specificSkills: ['Automation', 'APIs', 'Real-world scripting', 'Integration'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Process optimization', 'Efficiency analysis'] },
    ],
    onetSkillsAddressed: ['Programming', 'Operations Analysis', 'Technology Design'],
    technologies: ['Python', 'APIs', 'Automation frameworks'],
    softSkills: ['Automation mindset'],
  },
];

// ============================================================================
// MEDICAL BILLING, CODING, AND HEALTH INFORMATION TECHNOLOGY
// ============================================================================

const HEALTH_INFORMATION_TECH_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'mchit-course-1',
    courseName: 'Introduction to Health Information Technology',
    programSlug: 'health-information-technology-mchit',
    programTitle: 'Medical Coding & Health Information Technology',
    partner: 'Healthcare Career Pathway',
    estimatedHours: 10,
    contributions: [
      { axis: 'Service', score: 30, specificSkills: ['HIPAA', 'Privacy', 'HIT fundamentals'] },
      { axis: 'Research', score: 20, specificSkills: ['Health data concepts'] },
    ],
    onetSkillsAddressed: ['Social Perceptiveness', 'Reading Comprehension'],
    technologies: ['EHR systems'],
    softSkills: ['Healthcare mindset'],
  },
  {
    courseSlug: 'mchit-course-2',
    courseName: 'Medical Terminology and Anatomy',
    programSlug: 'health-information-technology-mchit',
    programTitle: 'Medical Coding & Health Information Technology',
    partner: 'Healthcare Career Pathway',
    estimatedHours: 10,
    contributions: [
      { axis: 'Research', score: 40, specificSkills: ['Medical terminology', 'Anatomy', 'Physiology'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Medical knowledge organization'] },
    ],
    onetSkillsAddressed: ['Science', 'Memorization', 'Reading Comprehension'],
    technologies: ['Medical dictionaries', 'Anatomy apps'],
    softSkills: ['Medical fluency'],
  },
  {
    courseSlug: 'mchit-course-3',
    courseName: 'Health Information Management',
    programSlug: 'health-information-technology-mchit',
    programTitle: 'Medical Coding & Health Information Technology',
    partner: 'Healthcare Career Pathway',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 30, specificSkills: ['HIM principles', 'Data governance', 'Workflow'] },
      { axis: 'Service', score: 30, specificSkills: ['Compliance', 'Data integrity'] },
    ],
    onetSkillsAddressed: ['Management of Material Resources', 'Systems Analysis'],
    technologies: ['HIM systems', 'Data governance tools'],
    softSkills: ['Governance mindset'],
  },
  {
    courseSlug: 'mchit-course-4',
    courseName: 'Electronic Health Records (EHR)',
    programSlug: 'health-information-technology-mchit',
    programTitle: 'Medical Coding & Health Information Technology',
    partner: 'Healthcare Career Pathway',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 35, specificSkills: ['EHR systems', 'Workflow design', 'Implementation'] },
      { axis: 'Service', score: 30, specificSkills: ['Patient privacy', 'Security'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Systems Analysis'],
    technologies: ['Epic', 'Cerner', 'EHR platforms'],
    softSkills: ['EHR fluency'],
  },
  {
    courseSlug: 'mchit-course-5',
    courseName: 'Healthcare Law, Ethics & HIPAA',
    programSlug: 'health-information-technology-mchit',
    programTitle: 'Medical Coding & Health Information Technology',
    partner: 'Healthcare Career Pathway',
    estimatedHours: 10,
    contributions: [
      { axis: 'Service', score: 50, specificSkills: ['Healthcare law', 'HIPAA', 'Compliance', 'Ethics'] },
      { axis: 'Strategy', score: 20, specificSkills: ['Risk management', 'Policy'] },
    ],
    onetSkillsAddressed: ['Judgment and Decision Making', 'Social Perceptiveness'],
    technologies: ['Compliance tools'],
    softSkills: ['Compliance expertise'],
  },
  {
    courseSlug: 'mchit-course-6',
    courseName: 'Medical Coding: ICD-10 and CPT',
    programSlug: 'health-information-technology-mchit',
    programTitle: 'Medical Coding & Health Information Technology',
    partner: 'Healthcare Career Pathway',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 45, specificSkills: ['ICD-10', 'CPT', 'Medical coding', 'Classification'] },
      { axis: 'Research', score: 30, specificSkills: ['Code research', 'Documentation'] },
    ],
    onetSkillsAddressed: ['Category Flexibility', 'Information Ordering', 'Reading Comprehension'],
    technologies: ['Coding software', 'Encoder tools'],
    softSkills: ['Coding precision'],
  },
  {
    courseSlug: 'mchit-course-7',
    courseName: 'Revenue Cycle Management',
    programSlug: 'health-information-technology-mchit',
    programTitle: 'Medical Coding & Health Information Technology',
    partner: 'Healthcare Career Pathway',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 35, specificSkills: ['Revenue cycle', 'Billing', 'Claims', 'Reimbursement'] },
      { axis: 'Analytics', score: 30, specificSkills: ['Financial analysis', 'Denial management'] },
    ],
    onetSkillsAddressed: ['Mathematics', 'Management of Material Resources'],
    technologies: ['Billing systems', 'Claims management'],
    softSkills: ['Revenue thinking'],
  },
  {
    courseSlug: 'mchit-course-8',
    courseName: 'Capstone: HIT Practice Simulation',
    programSlug: 'health-information-technology-mchit',
    programTitle: 'Medical Coding & Health Information Technology',
    partner: 'Healthcare Career Pathway',
    estimatedHours: 10,
    contributions: [
      { axis: 'Service', score: 30, specificSkills: ['Professional practice', 'Integration'] },
      { axis: 'Strategy', score: 25, specificSkills: ['Workflow design', 'Career readiness'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Applied coding', 'Quality assurance'] },
    ],
    onetSkillsAddressed: ['Complex Problem Solving', 'Systems Evaluation'],
    technologies: ['Full HIT stack'],
    softSkills: ['Professional readiness'],
  },
];

// ============================================================================
// CERTIFIED PRODUCTION TECHNICIAN (CPT)
// ============================================================================

const CPT_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'cpt-course-1',
    courseName: 'Introduction to Manufacturing',
    programSlug: 'certified-production-technician-cpt',
    programTitle: 'Certified Production Technician (CPT)',
    partner: 'CPT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 30, specificSkills: ['Manufacturing basics', 'Industry overview'] },
      { axis: 'Strategy', score: 15, specificSkills: ['Manufacturing careers'] },
    ],
    onetSkillsAddressed: ['Technology Design'],
    technologies: ['Manufacturing tools'],
    softSkills: ['Manufacturing mindset'],
  },
  {
    courseSlug: 'cpt-course-2',
    courseName: 'Blueprint Reading and Technical Drawing',
    programSlug: 'certified-production-technician-cpt',
    programTitle: 'Certified Production Technician (CPT)',
    partner: 'CPT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Design', score: 35, specificSkills: ['Blueprint reading', 'Technical drawing', 'GD&T'] },
      { axis: 'Engineering', score: 30, specificSkills: ['Engineering drawings', 'Specifications'] },
    ],
    onetSkillsAddressed: ['Visualization', 'Spatial Orientation'],
    technologies: ['CAD viewers', 'Blueprint tools'],
    softSkills: ['Technical visualization'],
  },
  {
    courseSlug: 'cpt-course-3',
    courseName: 'Machining and CNC Operations',
    programSlug: 'certified-production-technician-cpt',
    programTitle: 'Certified Production Technician (CPT)',
    partner: 'CPT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 50, specificSkills: ['Machining', 'CNC', 'G-code', 'Tooling'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Precision measurement', 'Quality control'] },
    ],
    onetSkillsAddressed: ['Operation and Control', 'Equipment Maintenance', 'Quality Control Analysis'],
    technologies: ['CNC machines', 'G-code', 'Measurement tools'],
    softSkills: ['Precision mindset'],
  },
  {
    courseSlug: 'cpt-course-4',
    courseName: 'Welding Fundamentals',
    programSlug: 'certified-production-technician-cpt',
    programTitle: 'Certified Production Technician (CPT)',
    partner: 'CPT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Welding', 'Fabrication', 'Metallurgy'] },
      { axis: 'Service', score: 25, specificSkills: ['Safety', 'Quality'] },
    ],
    onetSkillsAddressed: ['Operation and Control', 'Equipment Maintenance'],
    technologies: ['Welding equipment', 'Safety gear'],
    softSkills: ['Safety focus'],
  },
  {
    courseSlug: 'cpt-course-5',
    courseName: 'Quality Control and Inspection',
    programSlug: 'certified-production-technician-cpt',
    programTitle: 'Certified Production Technician (CPT)',
    partner: 'CPT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 45, specificSkills: ['Quality control', 'Inspection', 'SPC', 'Metrology'] },
      { axis: 'Engineering', score: 30, specificSkills: ['Measurement systems', 'Calibration'] },
    ],
    onetSkillsAddressed: ['Quality Control Analysis', 'Mathematics', 'Operations Analysis'],
    technologies: ['Measurement tools', 'SPC software', 'CMM'],
    softSkills: ['Quality mindset'],
  },
  {
    courseSlug: 'cpt-course-6',
    courseName: 'Safety and OSHA Compliance',
    programSlug: 'certified-production-technician-cpt',
    programTitle: 'Certified Production Technician (CPT)',
    partner: 'CPT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Service', score: 50, specificSkills: ['Safety', 'OSHA', 'Compliance', 'Risk management'] },
      { axis: 'Strategy', score: 20, specificSkills: ['Safety programs', 'Culture'] },
    ],
    onetSkillsAddressed: ['Management of Material Resources', 'Judgment and Decision Making'],
    technologies: ['Safety systems', 'OSHA resources'],
    softSkills: ['Safety leadership'],
  },
  {
    courseSlug: 'cpt-course-7',
    courseName: 'Lean Manufacturing Principles',
    programSlug: 'certified-production-technician-cpt',
    programTitle: 'Certified Production Technician (CPT)',
    partner: 'CPT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 40, specificSkills: ['Lean', 'Continuous improvement', 'Waste reduction'] },
      { axis: 'Analytics', score: 30, specificSkills: ['Process analysis', 'Value stream mapping'] },
    ],
    onetSkillsAddressed: ['Systems Analysis', 'Systems Evaluation', 'Operations Analysis'],
    technologies: ['Lean tools', 'VSM software'],
    softSkills: ['Continuous improvement'],
  },
  {
    courseSlug: 'cpt-course-8',
    courseName: 'Production Technology Capstone',
    programSlug: 'certified-production-technician-cpt',
    programTitle: 'Certified Production Technician (CPT)',
    partner: 'CPT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Integration', 'Applied manufacturing'] },
      { axis: 'Strategy', score: 25, specificSkills: ['Career readiness', 'Certification prep'] },
    ],
    onetSkillsAddressed: ['Complex Problem Solving', 'Systems Evaluation'],
    technologies: ['Full manufacturing stack'],
    softSkills: ['Professional readiness'],
  },
];

// ============================================================================
// CERTIFIED LOGISTICS TECHNICIAN (CLT)
// ============================================================================

const CLT_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'clt-course-1',
    courseName: 'Introduction to Supply Chain Management',
    programSlug: 'certified-logistics-technician-clt',
    programTitle: 'Certified Logistics Technician (CLT)',
    partner: 'CLT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 30, specificSkills: ['Supply chain basics', 'Industry overview'] },
      { axis: 'Analytics', score: 20, specificSkills: ['SC concepts', 'Flow understanding'] },
    ],
    onetSkillsAddressed: ['Systems Analysis'],
    technologies: ['SCM concepts'],
    softSkills: ['Supply chain mindset'],
  },
  {
    courseSlug: 'clt-course-2',
    courseName: 'Inventory Management and Control',
    programSlug: 'certified-logistics-technician-clt',
    programTitle: 'Certified Logistics Technician (CLT)',
    partner: 'CLT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Analytics', score: 40, specificSkills: ['Inventory', 'Forecasting', 'ABC analysis'] },
      { axis: 'Strategy', score: 30, specificSkills: ['Inventory strategy', 'Optimization'] },
    ],
    onetSkillsAddressed: ['Mathematics', 'Management of Material Resources'],
    technologies: ['WMS', 'ERP', 'Inventory systems'],
    softSkills: ['Inventory thinking'],
  },
  {
    courseSlug: 'clt-course-3',
    courseName: 'Transportation and Distribution',
    programSlug: 'certified-logistics-technician-clt',
    programTitle: 'Certified Logistics Technician (CLT)',
    partner: 'CLT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 35, specificSkills: ['Transportation', 'Distribution', 'Routing'] },
      { axis: 'Engineering', score: 25, specificSkills: ['Transportation modes', 'Equipment'] },
    ],
    onetSkillsAddressed: ['Operations Analysis', 'Management of Material Resources'],
    technologies: ['TMS', 'Routing software'],
    softSkills: ['Transportation expertise'],
  },
  {
    courseSlug: 'clt-course-4',
    courseName: 'Warehouse Operations',
    programSlug: 'certified-logistics-technician-clt',
    programTitle: 'Certified Logistics Technician (CLT)',
    partner: 'CLT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Warehouse', 'Material handling', 'Layout'] },
      { axis: 'Strategy', score: 25, specificSkills: ['Warehouse design', 'Efficiency'] },
    ],
    onetSkillsAddressed: ['Operations Analysis', 'Technology Design'],
    technologies: ['WMS', 'RFID', 'Barcode', 'Forklifts'],
    softSkills: ['Operational excellence'],
  },
  {
    courseSlug: 'clt-course-5',
    courseName: 'Procurement and Vendor Management',
    programSlug: 'certified-logistics-technician-clt',
    programTitle: 'Certified Logistics Technician (CLT)',
    partner: 'CLT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 40, specificSkills: ['Procurement', 'Sourcing', 'Negotiation'] },
      { axis: 'Service', score: 25, specificSkills: ['Vendor relations', 'Ethics'] },
    ],
    onetSkillsAddressed: ['Negotiation', 'Management of Material Resources'],
    technologies: ['Procurement systems', 'ERP'],
    softSkills: ['Negotiation skills'],
  },
  {
    courseSlug: 'clt-course-6',
    courseName: 'Supply Chain Technology and SAP',
    programSlug: 'certified-logistics-technician-clt',
    programTitle: 'Certified Logistics Technician (CLT)',
    partner: 'CLT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['SAP', 'ERP', 'SC technology', 'Systems'] },
      { axis: 'Analytics', score: 30, specificSkills: ['System analysis', 'Data flow'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Systems Analysis'],
    technologies: ['SAP', 'ERP systems', 'SCM software'],
    softSkills: ['Systems expertise'],
  },
  {
    courseSlug: 'clt-course-7',
    courseName: 'Global Supply Chain and Trade',
    programSlug: 'certified-logistics-technician-clt',
    programTitle: 'Certified Logistics Technician (CLT)',
    partner: 'CLT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 40, specificSkills: ['Global trade', 'Import/export', 'Compliance'] },
      { axis: 'Service', score: 25, specificSkills: ['Trade ethics', 'Regulations'] },
    ],
    onetSkillsAddressed: ['Management of Material Resources', 'Judgment and Decision Making'],
    technologies: ['Trade platforms', 'Compliance tools'],
    softSkills: ['Global thinking'],
  },
  {
    courseSlug: 'clt-course-8',
    courseName: 'CLT Certification Preparation',
    programSlug: 'certified-logistics-technician-clt',
    programTitle: 'Certified Logistics Technician (CLT)',
    partner: 'CLT',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 30, specificSkills: ['Certification prep', 'Career readiness'] },
      { axis: 'Analytics', score: 25, specificSkills: ['Knowledge synthesis'] },
    ],
    onetSkillsAddressed: ['Learning Strategies', 'Time Management'],
    technologies: ['Exam prep tools'],
    softSkills: ['Exam readiness'],
  },
];

// ============================================================================
// CONSTRUCTION READINESS (OSHA-10)
// ============================================================================

const CONSTRUCTION_COURSES: CourseSkillMapping[] = [
  {
    courseSlug: 'construction-course-1',
    courseName: 'Introduction to Construction Industry',
    programSlug: 'core-construction-training-certificate',
    programTitle: 'Core Construction',
    partner: 'OSHA-10 / WorkforceAP',
    estimatedHours: 10,
    contributions: [
      { axis: 'Strategy', score: 25, specificSkills: ['Construction overview', 'Careers'] },
      { axis: 'Engineering', score: 20, specificSkills: ['Industry basics'] },
    ],
    onetSkillsAddressed: ['Technology Design'],
    technologies: ['Construction tools'],
    softSkills: ['Construction mindset'],
  },
  {
    courseSlug: 'construction-course-2',
    courseName: 'Blueprint Reading and Construction Math',
    programSlug: 'core-construction-training-certificate',
    programTitle: 'Core Construction',
    partner: 'OSHA-10 / WorkforceAP',
    estimatedHours: 10,
    contributions: [
      { axis: 'Design', score: 35, specificSkills: ['Blueprint reading', 'Construction drawings'] },
      { axis: 'Analytics', score: 30, specificSkills: ['Construction math', 'Measurement'] },
    ],
    onetSkillsAddressed: ['Visualization', 'Mathematics', 'Number Facility'],
    technologies: ['Blueprint tools', 'Calculators'],
    softSkills: ['Technical math'],
  },
  {
    courseSlug: 'construction-course-3',
    courseName: 'Construction Safety and OSHA-10',
    programSlug: 'core-construction-training-certificate',
    programTitle: 'Core Construction',
    partner: 'OSHA-10 / WorkforceAP',
    estimatedHours: 10,
    contributions: [
      { axis: 'Service', score: 50, specificSkills: ['OSHA-10', 'Safety', 'Compliance', 'Hazards'] },
      { axis: 'Strategy', score: 20, specificSkills: ['Safety programs', 'Culture'] },
    ],
    onetSkillsAddressed: ['Management of Material Resources', 'Judgment and Decision Making'],
    technologies: ['Safety equipment', 'OSHA resources'],
    softSkills: ['Safety leadership'],
  },
  {
    courseSlug: 'construction-course-4',
    courseName: 'Hand and Power Tools',
    programSlug: 'core-construction-training-certificate',
    programTitle: 'Core Construction',
    partner: 'OSHA-10 / WorkforceAP',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 40, specificSkills: ['Hand tools', 'Power tools', 'Tool safety'] },
      { axis: 'Service', score: 25, specificSkills: ['Tool safety', 'Maintenance'] },
    ],
    onetSkillsAddressed: ['Equipment Maintenance', 'Operation and Control'],
    technologies: ['Construction tools'],
    softSkills: ['Tool proficiency'],
  },
  {
    courseSlug: 'construction-course-5',
    courseName: 'Concrete and Masonry Fundamentals',
    programSlug: 'core-construction-training-certificate',
    programTitle: 'Core Construction',
    partner: 'OSHA-10 / WorkforceAP',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Concrete', 'Masonry', 'Formwork'] },
      { axis: 'Analytics', score: 20, specificSkills: ['Mix calculations', 'Measurement'] },
    ],
    onetSkillsAddressed: ['Operation and Control', 'Mathematics'],
    technologies: ['Masonry tools', 'Concrete equipment'],
    softSkills: ['Craftsmanship'],
  },
  {
    courseSlug: 'construction-course-6',
    courseName: 'Carpentry and Framing Basics',
    programSlug: 'core-construction-training-certificate',
    programTitle: 'Core Construction',
    partner: 'OSHA-10 / WorkforceAP',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Carpentry', 'Framing', 'Woodworking'] },
      { axis: 'Design', score: 25, specificSkills: ['Layout', 'Reading plans'] },
    ],
    onetSkillsAddressed: ['Operation and Control', 'Visualization'],
    technologies: ['Carpentry tools'],
    softSkills: ['Craft precision'],
  },
  {
    courseSlug: 'construction-course-7',
    courseName: 'Electrical and Plumbing Basics',
    programSlug: 'core-construction-training-certificate',
    programTitle: 'Core Construction',
    partner: 'OSHA-10 / WorkforceAP',
    estimatedHours: 10,
    contributions: [
      { axis: 'Engineering', score: 45, specificSkills: ['Electrical basics', 'Plumbing basics', 'Codes'] },
      { axis: 'Service', score: 30, specificSkills: ['Code compliance', 'Safety'] },
    ],
    onetSkillsAddressed: ['Technology Design', 'Installation'],
    technologies: ['Electrical tools', 'Plumbing tools'],
    softSkills: ['Code awareness'],
  },
  {
    courseSlug: 'construction-course-8',
    courseName: 'Construction Readiness Capstone',
    programSlug: 'core-construction-training-certificate',
    programTitle: 'Core Construction',
    partner: 'OSHA-10 / WorkforceAP',
    estimatedHours: 10,
    contributions: [
      { axis: 'Service', score: 30, specificSkills: ['Professional readiness', 'Safety mastery'] },
      { axis: 'Strategy', score: 25, specificSkills: ['Career preparation'] },
      { axis: 'Engineering', score: 25, specificSkills: ['Skill integration'] },
    ],
    onetSkillsAddressed: ['Complex Problem Solving'],
    technologies: ['Full construction toolkit'],
    softSkills: ['Job readiness'],
  },
];

// ============================================================================
// AGGREGATE ALL COURSES
// ============================================================================

export const ALL_COURSE_MAPPINGS: CourseSkillMapping[] = [
  ...DIGITAL_LITERACY_COURSES,
  ...DATA_ANALYTICS_COURSES,
  ...UX_DESIGN_COURSES,
  ...SOFTWARE_DEVELOPER_COURSES,
  ...CYBERSECURITY_COURSES,
  ...AI_DEVELOPER_COURSES,
  ...DATA_SCIENCE_COURSES,
  ...IT_SUPPORT_COURSES,
  ...PROJECT_MANAGEMENT_COURSES,
  ...DIGITAL_MARKETING_COURSES,
  ...AWS_CLOUD_COURSES,
  ...COMPTIA_A_COURSES,
  ...COMPTIA_NETWORK_COURSES,
  ...COMPTIA_SECURITY_COURSES,
  ...IT_AUTOMATION_COURSES,
  ...HEALTH_INFORMATION_TECH_COURSES,
  ...CPT_COURSES,
  ...CLT_COURSES,
  ...CONSTRUCTION_COURSES,
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all course mappings for a specific program.
 */
export function getCoursesForProgram(programSlug: string): CourseSkillMapping[] {
  return ALL_COURSE_MAPPINGS.filter(c => c.programSlug === programSlug);
}

/**
 * Get courses that contribute to a specific axis.
 */
export function getCoursesByAxis(axis: string): CourseSkillMapping[] {
  return ALL_COURSE_MAPPINGS.filter(c => 
    c.contributions.some(contrib => contrib.axis === axis)
  );
}

/**
 * Calculate total axis scores for a program based on its courses.
 */
export function calculateProgramAxisScores(programSlug: string): Record<string, number> {
  const courses = getCoursesForProgram(programSlug);
  const scores: Record<string, number> = {
    Analytics: 0,
    Engineering: 0,
    Design: 0,
    Strategy: 0,
    Ethics: 0,
    Research: 0,
  };
  
  for (const course of courses) {
    for (const contrib of course.contributions) {
      scores[contrib.axis] = (scores[contrib.axis] || 0) + contrib.score;
    }
  }
  
  // Cap at 100
  for (const axis of Object.keys(scores)) {
    scores[axis] = Math.min(100, scores[axis]);
  }
  
  return scores;
}

/**
 * Find courses that best close a specific skill gap.
 * Returns courses sorted by relevance to the gap.
 */
export function findCoursesForGap(
  gapAxis: string,
  gapAmount: number,
  memberCurrentScore: number,
  options?: {
    limit?: number;
    excludePrograms?: string[];
    preferredPartner?: string;
  }
): Array<{
  course: CourseSkillMapping;
  relevanceScore: number;
  estimatedImpact: number;
}> {
  const courses = getCoursesByAxis(gapAxis);
  
  const scored = courses.map(course => {
    const axisContrib = course.contributions.find(c => c.axis === gapAxis);
    if (!axisContrib) return null;
    
    // Relevance = contribution score weighted by how much we need it
    const needFactor = Math.min(1, gapAmount / 50); // Normalize gap to 0-1
    const relevanceScore = axisContrib.score * (1 + needFactor);
    
    // Estimated impact = how much this course would close the gap
    const estimatedImpact = Math.min(gapAmount, axisContrib.score * 0.8); // Assume 80% effectiveness
    
    return {
      course,
      relevanceScore,
      estimatedImpact,
    };
  }).filter(Boolean) as Array<{
    course: CourseSkillMapping;
    relevanceScore: number;
    estimatedImpact: number;
  }>;
  
  // Sort by relevance
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  return scored.slice(0, options?.limit ?? 5);
}

/**
 * Build a personalized course path to close skill gaps.
 */
export function buildCoursePathForGaps(
  gaps: Array<{ axis: string; member: number; target: number; gap: number }>,
  memberProfile: { axis: string; value: number }[],
  options?: {
    maxCourses?: number;
    excludePrograms?: string[];
  }
): Array<{
  course: CourseSkillMapping;
  addressesGap: string;
  estimatedImpact: number;
  priority: number;
}> {
  const path: Array<{
    course: CourseSkillMapping;
    addressesGap: string;
    estimatedImpact: number;
    priority: number;
  }> = [];
  
  const usedSlugs = new Set<string>();
  let priority = 1;
  
  // Sort gaps by size (largest first)
  const sortedGaps = [...gaps].sort((a, b) => b.gap - a.gap);
  
  for (const gap of sortedGaps) {
    if (path.length >= (options?.maxCourses ?? 6)) break;
    
    const courses = findCoursesForGap(gap.axis, gap.gap, gap.member, {
      limit: 2,
      excludePrograms: options?.excludePrograms,
    });
    
    for (const { course, estimatedImpact } of courses) {
      if (usedSlugs.has(course.courseSlug)) continue;
      if (path.length >= (options?.maxCourses ?? 6)) break;
      
      usedSlugs.add(course.courseSlug);
      path.push({
        course,
        addressesGap: gap.axis,
        estimatedImpact,
        priority: priority++,
      });
    }
  }
  
  return path;
}

/**
 * Get fallback Design score for an occupation based on its mapped programs.
 * Used when O*NET returns 0 for Design axis.
 */
export function getFallbackDesignScore(
  onetCode: string,
  programMappings: Array<{ programSlug: string; priority: number }>
): number {
  if (!programMappings.length) return 0;
  
  // Get Design scores from mapped programs
  const designScores = programMappings.map(pm => {
    const courseScores = calculateProgramAxisScores(pm.programSlug);
    return courseScores.Design * (1 / pm.priority); // Weight by priority
  });
  
  // Average weighted scores
  const totalWeight = programMappings.reduce((sum, pm) => sum + (1 / pm.priority), 0);
  const weightedAverage = designScores.reduce((sum, score) => sum + score, 0) / totalWeight;
  
  return Math.round(weightedAverage);
}

/**
 * Check if an occupation is design-related based on its title or code.
 */
export function isDesignRelatedOccupation(title: string, code: string): boolean {
  const designKeywords = [
    'design', 'ux', 'ui', 'graphic', 'visual', 'creative', 'art', 'media',
    'multimedia', 'animation', 'illustration', 'photography', 'video',
    'web design', 'product design', 'interaction', 'user experience',
    'user interface', 'artistic', 'fashion', 'interior', 'architect',
  ];
  
  const lowerTitle = title.toLowerCase();
  return designKeywords.some(kw => lowerTitle.includes(kw));
}
