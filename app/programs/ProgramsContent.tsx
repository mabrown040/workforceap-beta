'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Program {
  title: string;
  category: string;
  categoryLabel: string;
  categoryColor: string;
  borderColor: string;
  icon: string;
  duration: string;
  salary: string;
  skills: string[];
  courses: string[];
  partner: string;
}

const programs: Program[] = [
  {
    title: 'Digital Literacy Empowerment Class',
    category: 'digital-literacy', categoryLabel: 'Digital Literacy', categoryColor: '#666', borderColor: '#666', icon: '💻',
    duration: '6-7 Weeks, 20 hrs/week', salary: 'Starting salary: $38K-$52K',
    skills: ['Digital literacy', 'Email', 'Financial literacy', 'Online safety'],
    courses: ['Orientation & Informational Session', 'Device Distribution & Setup + Browser & Search Engines', 'Introduction to Emails & Advanced Email Techniques', 'Avoiding Online Scams + Introduction to Financial Literacy', 'PCC Portal & Connect ATX Navigation', 'Graduation, Exit Surveys & ETP Forms'],
    partner: 'WorkforceAP',
  },
  {
    title: 'AI Professional Developer Certificate (IBM)',
    category: 'ai-software', categoryLabel: 'AI & Software Dev', categoryColor: '#8b4a9b', borderColor: '#8b4a9b', icon: '🤖',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $85K-$135K',
    skills: ['Python', 'AI/ML', 'Generative AI', 'Flask'],
    courses: ['Introduction to Software Engineering', 'Introduction to Artificial Intelligence (AI)', 'Generative AI: Introduction and Applications', 'Generative AI: Prompt Engineering Basics', 'Introduction to HTML, CSS, & JavaScript', 'Python for Data Science, AI & Development', 'Developing AI Applications with Python and Flask', 'Building Generative AI-Powered Applications with Python', 'Generative AI: Elevate your Software Development Career', 'Software Developer Career Guide and Interview Preparation'],
    partner: 'IBM',
  },
  {
    title: 'AWS Cloud Technology (Amazon)',
    category: 'cloud-data', categoryLabel: 'Cloud & Data', categoryColor: '#2b7bb9', borderColor: '#2b7bb9', icon: '☁️',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $95K-$145K',
    skills: ['AWS', 'Cloud architecture', 'DevOps', 'Python'],
    courses: ['Introduction to Information Technology and AWS Cloud', 'Providing Technical Support for AWS Workloads', 'Developing Applications in Python on AWS', 'Skills for Working as an AWS Cloud Consultant', 'DevOps on AWS and Project Management', 'Automation in the AWS Cloud', 'Data Analytics and Databases on AWS', 'Capstone: Following the AWS Well Architected Framework'],
    partner: 'Amazon Web Services',
  },
  {
    title: 'CompTIA A+ Professional Certificate',
    category: 'it-cyber', categoryLabel: 'IT & Cybersecurity', categoryColor: '#ad2c4d', borderColor: '#ad2c4d', icon: '🛡️',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $55K-$78K',
    skills: ['Hardware', 'Networking', 'Security', 'OS'],
    courses: ['IT Fundamentals and Hardware Essentials', 'Networking, Peripherals, and Wireless Technologies', 'Advanced Networking, Virtualization, and IT Security', 'Foundations of Computer Hardware and Storage', 'Operating Systems and Networking Fundamentals', 'Advanced Networking, Security, and IT Operations', 'Practice Exams for CompTIA A+ Core 1 & Core 2'],
    partner: 'CompTIA',
  },
  {
    title: 'CompTIA Network+ Professional Certificate',
    category: 'it-cyber', categoryLabel: 'IT & Cybersecurity', categoryColor: '#ad2c4d', borderColor: '#ad2c4d', icon: '🛡️',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $60K-$88K',
    skills: ['Networking', 'TCP/IP', 'Cisco', 'Wireless'],
    courses: ['Introduction to Networking', 'Networking Fundamentals', 'Introduction to Contemporary Operating Systems and Hardware', 'Introduction to Networking and Storage', 'Basics of Cisco Networking', 'CCNA Foundations', 'TCP/IP and Advanced Topics', 'Operating Systems and Networking Fundamentals', 'Network Foundations and Addressing'],
    partner: 'CompTIA',
  },
  {
    title: 'CompTIA Security+ Professional Certificate',
    category: 'it-cyber', categoryLabel: 'IT & Cybersecurity', categoryColor: '#ad2c4d', borderColor: '#ad2c4d', icon: '🛡️',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $72K-$108K',
    skills: ['Network security', 'Risk management', 'Cryptography'],
    courses: ['Network Security', 'Introduction to Network Security', 'System and Network Security', 'Computer Networks and Network Security'],
    partner: 'CompTIA',
  },
  {
    title: 'Cybersecurity Professional Certificate (Google)',
    category: 'it-cyber', categoryLabel: 'IT & Cybersecurity', categoryColor: '#ad2c4d', borderColor: '#ad2c4d', icon: '🛡️',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $75K-$112K',
    skills: ['Linux', 'SQL', 'Python', 'Incident response'],
    courses: ['Foundations of Cybersecurity', 'Play It Safe: Manage Security Risks', 'Connect and Protect: Networks and Network Security', 'Tools of the Trade: Linux and SQL', 'Assets, Threats, and Vulnerabilities', 'Sound the Alarm: Detection and Response', 'Automate Cybersecurity Tasks with Python', 'Put It to Work: Prepare for Cybersecurity Jobs'],
    partner: 'Google',
  },
  {
    title: 'Data Analytics Professional Certificate (Google)',
    category: 'cloud-data', categoryLabel: 'Cloud & Data', categoryColor: '#a47f38', borderColor: '#a47f38', icon: '📊',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $72K-$102K',
    skills: ['Spreadsheets', 'SQL', 'R', 'Tableau', 'Data viz'],
    courses: ['Foundations: Data, Data, Everywhere', 'Ask Questions to Make Data-Driven Decisions', 'Prepare Data for Exploration', 'Process Data from Dirty to Clean', 'Analyze Data to Answer Questions', 'Share Data Through the Art of Visualization', 'Data Analysis with R Programming', 'Google Data Analytics Capstone'],
    partner: 'Google',
  },
  {
    title: 'Data Science Professional Certificate (IBM)',
    category: 'cloud-data', categoryLabel: 'Cloud & Data', categoryColor: '#a47f38', borderColor: '#a47f38', icon: '📊',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $88K-$130K',
    skills: ['Python', 'SQL', 'Machine Learning', 'Jupyter'],
    courses: ['What is Data Science?', 'Tools for Data Science', 'Data Science Methodology', 'Python for Data Science, AI & Development', 'Python Project for Data Science', 'Databases and SQL for Data Science with Python', 'Data Analysis with Python', 'Data Visualization with Python', 'Machine Learning with Python', 'Applied Data Science Capstone'],
    partner: 'IBM',
  },
  {
    title: 'Project Management Professional Certificate (Microsoft)',
    category: 'business', categoryLabel: 'Business', categoryColor: '#a47f38', borderColor: '#a47f38', icon: '💼',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $82K-$112K',
    skills: ['Agile', 'Scrum', 'MS Project', 'Risk management'],
    courses: ['Project Management Foundations', 'Initiating and Planning Projects', 'Project Scheduling and Cost Management', 'Managing Project Risks, Changes and Stakeholders', 'Project Leadership, Communication and Stakeholder Management', 'Agile Project Management', 'Microsoft Project & Power BI for Project Managers', 'Project Management Capstone'],
    partner: 'Microsoft',
  },
  {
    title: 'Digital Marketing & E-Commerce (Google)',
    category: 'business', categoryLabel: 'Business', categoryColor: '#a47f38', borderColor: '#a47f38', icon: '💼',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $62K-$78K',
    skills: ['SEO', 'SEM', 'Email marketing', 'Analytics'],
    courses: ['Foundations of Digital Marketing and E-commerce', 'Attract and Engage Customers with Digital Marketing', 'From Likes to Leads: Interact with Customers Online', 'Think Outside the Inbox: Email Marketing', 'Assess for Success: Marketing Analytics and Measurement', 'Make the Sale: Build, Launch, and Manage E-commerce Stores', 'Satisfaction Guaranteed: Develop Customer Loyalty Online'],
    partner: 'Google',
  },
  {
    title: 'UX Design Professional Certificate (Google)',
    category: 'business', categoryLabel: 'Business', categoryColor: '#a47f38', borderColor: '#a47f38', icon: '💼',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $88K-$120K',
    skills: ['User research', 'Wireframing', 'Figma', 'Prototyping'],
    courses: ['Foundations of User Experience (UX) Design', 'Start the UX Design Process: Empathize, Define, and Ideate', 'Build Wireframes and Low-Fidelity Prototypes', 'Conduct UX Research and Test Early Concepts', 'Create High-Fidelity Designs and Prototypes in Figma', 'Responsive Web Design in Adobe XD', 'Design a User Experience for Social Good & Prepare for Jobs'],
    partner: 'Google',
  },
  {
    title: 'IT Support Professional Certificate (IBM)',
    category: 'it-cyber', categoryLabel: 'IT & Cybersecurity', categoryColor: '#ad2c4d', borderColor: '#ad2c4d', icon: '💻',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $55K-$72K',
    skills: ['Help desk', 'Hardware', 'Software', 'Customer service'],
    courses: ['Introduction to Technical Support', 'Introduction to Hardware and Operating Systems', 'Introduction to Software, Programming, and Databases', 'Introduction to Networking and Storage', 'Introduction to Cybersecurity Essentials', 'Introduction to Cloud Computing', 'Technical Support Case Studies and Capstone Project'],
    partner: 'IBM',
  },
  {
    title: 'IT Automation with Python (Google)',
    category: 'it-cyber', categoryLabel: 'IT & Cybersecurity', categoryColor: '#ad2c4d', borderColor: '#ad2c4d', icon: '💻',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $78K-$98K',
    skills: ['Python', 'Git', 'Bash', 'APIs', 'IT automation'],
    courses: ['Crash Course on Python', 'Using Python to Interact with the Operating System', 'Introduction to Git and GitHub', 'Troubleshooting and Debugging Techniques', 'Configuration Management and the Cloud', 'Automating Real-World Tasks with Python'],
    partner: 'Google',
  },
  {
    title: 'Health Information Technology (MCHIT)',
    category: 'healthcare', categoryLabel: 'Healthcare', categoryColor: '#4a9b4f', borderColor: '#4a9b4f', icon: '❤️',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $52K-$72K',
    skills: ['Medical coding', 'EHR', 'HIPAA', 'ICD-10'],
    courses: ['Introduction to Health Information Technology', 'Medical Terminology and Anatomy', 'Health Information Management', 'Electronic Health Records (EHR)', 'Healthcare Law, Ethics & HIPAA', 'Medical Coding: ICD-10 and CPT', 'Revenue Cycle Management', 'Capstone: HIT Practice Simulation'],
    partner: 'MCHIT',
  },
  {
    title: 'Production Technology Certificate (CPT)',
    category: 'manufacturing', categoryLabel: 'Manufacturing', categoryColor: '#1a1a1a', borderColor: '#1a1a1a', icon: '🏭',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $48K-$70K',
    skills: ['CNC', 'Manufacturing processes', 'Quality control'],
    courses: ['Introduction to Manufacturing', 'Blueprint Reading and Technical Drawing', 'Machining and CNC Operations', 'Welding Fundamentals', 'Quality Control and Inspection', 'Safety and OSHA Compliance', 'Lean Manufacturing Principles', 'Production Technology Capstone'],
    partner: 'CPT',
  },
  {
    title: 'Logistics and Supply Chain Certificate (CLT)',
    category: 'manufacturing', categoryLabel: 'Manufacturing', categoryColor: '#1a1a1a', borderColor: '#1a1a1a', icon: '🏭',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $55K-$78K',
    skills: ['Supply chain', 'Inventory', 'Transportation', 'SAP'],
    courses: ['Introduction to Supply Chain Management', 'Inventory Management and Control', 'Transportation and Distribution', 'Warehouse Operations', 'Procurement and Vendor Management', 'Supply Chain Technology and SAP', 'Global Supply Chain and Trade', 'CLT Certification Preparation'],
    partner: 'CLT',
  },
  {
    title: 'Construction Readiness Certificate (OSHA-10)',
    category: 'manufacturing', categoryLabel: 'Manufacturing', categoryColor: '#1a1a1a', borderColor: '#1a1a1a', icon: '🏗️',
    duration: '3-5 months, 10 hrs/week', salary: 'Starting salary: $48K-$68K',
    skills: ['OSHA-10', 'Blueprint reading', 'Construction fundamentals'],
    courses: ['Introduction to Construction Industry', 'Blueprint Reading and Construction Math', 'Construction Safety and OSHA-10', 'Hand and Power Tools', 'Concrete and Masonry Fundamentals', 'Carpentry and Framing Basics', 'Electrical and Plumbing Basics', 'Construction Readiness Capstone'],
    partner: 'OSHA-10 / WorkforceAP',
  },
  {
    title: 'Software Developer Professional Certificate (IBM)',
    category: 'ai-software', categoryLabel: 'AI & Software Dev', categoryColor: '#8b4a9b', borderColor: '#8b4a9b', icon: '💻',
    duration: '4-6 months, 10 hrs/week', salary: 'Starting salary: $78K-$98K',
    skills: ['HTML', 'CSS', 'JavaScript', 'Python', 'Databases'],
    courses: ['Introduction to Software Engineering', 'Introduction to HTML, CSS, & JavaScript', 'Getting Started with Git and GitHub', 'Python for Data Science, AI & Development', 'Developing Front-End Apps with React', 'Developing Back-End Apps with Node.js and Express', 'Django Application Development with SQL and Databases', 'Introduction to Containers w/ Docker, Kubernetes & OpenShift', 'Application Development using Microservices and Serverless', 'Software Developer Career Guide & Interview Preparation'],
    partner: 'IBM',
  },
];

const filters = [
  { key: 'all', label: 'All Programs (19)' },
  { key: 'digital-literacy', label: 'Digital Literacy (1)' },
  { key: 'ai-software', label: 'AI & Software (2)' },
  { key: 'cloud-data', label: 'Cloud & Data (3)' },
  { key: 'it-cyber', label: 'IT & Cyber (6)' },
  { key: 'business', label: 'Business (3)' },
  { key: 'healthcare', label: 'Healthcare (1)' },
  { key: 'manufacturing', label: 'Manufacturing (3)' },
];

function ProgramCard({ program }: { program: Program }) {
  const [open, setOpen] = useState(false);
  const count = program.courses.length;

  return (
    <div className="program-card category-it" data-category={program.category} style={{ borderTopColor: program.borderColor }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <span style={{ background: program.categoryColor, color: 'white', padding: '.3rem .75rem', borderRadius: '50px', fontSize: '.75rem', fontWeight: 600 }}>{program.categoryLabel}</span>
        <span style={{ fontSize: '1.8rem' }}>{program.icon}</span>
      </div>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '.5rem' }}>{program.title}</h3>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '.75rem', fontSize: '.85rem', color: '#666' }}>
        <span>⏱ {program.duration}</span>
        <span style={{ color: '#4a9b4f', fontWeight: 600 }}>{program.salary}</span>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        {program.skills.map((s) => (
          <span key={s} style={{ background: '#f0f0f0', padding: '.25rem .6rem', borderRadius: '4px', fontSize: '.8rem', margin: '.15rem .15rem 0 0', display: 'inline-block' }}>{s}</span>
        ))}
      </div>
      <details style={{ marginBottom: '1rem' }} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '.9rem', color: '#1a1a1a' }}>
          {open ? 'Hide' : 'View'} {count} course{count !== 1 ? 's' : ''}
        </summary>
        <ul style={{ listStyle: 'none', padding: '.75rem 0 0', margin: 0 }}>
          {program.courses.map((c) => (
            <li key={c} style={{ fontSize: '.85rem', color: '#555', padding: '.3rem 0', borderBottom: '1px solid #f0f0f0' }}>{c}</li>
          ))}
        </ul>
      </details>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '.8rem', color: '#888' }}>Partner: {program.partner}</span>
        <Link href="/apply" className="btn btn-secondary" style={{ padding: '.5rem 1rem', fontSize: '.85rem' }}>Apply Now</Link>
      </div>
    </div>
  );
}

export default function ProgramsContent() {
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = activeFilter === 'all'
    ? programs
    : programs.filter((p) => p.category === activeFilter);

  return (
    <section className="content-section">
      <div className="container">
        <div className="program-filters">
          {filters.map((f) => (
            <button
              key={f.key}
              className={`filter-chip${activeFilter === f.key ? ' active' : ''}`}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="programs-grid">
          {filtered.map((p) => (
            <ProgramCard key={p.title} program={p} />
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <Link href="/salary-guide" className="btn btn-outline">View Salary Guide</Link>
          &nbsp;&nbsp;
          <Link href="/program-comparison" className="btn btn-outline">Compare Programs</Link>
        </div>
      </div>
    </section>
  );
}
