import { JobLocationType, JobTypeEnum, JobStatusEnum, AIJobMatchStatus } from '@prisma/client';

export const DEMO_JOBS: Array<{
  title: string;
  description: string;
  location: string;
  locationType: JobLocationType;
  jobType: JobTypeEnum;
  salaryMin: number;
  salaryMax: number;
  requirements: string[];
  status: JobStatusEnum;
}> = [
  {
    title: 'IT Support Specialist',
    description: 'Provide technical support for end-users across our Austin headquarters. CompTIA A+ or Google IT Support certification preferred. Responsibilities include hardware troubleshooting, software installation, and help desk support.',
    location: 'Austin, TX',
    locationType: JobLocationType.hybrid,
    jobType: JobTypeEnum.fulltime,
    salaryMin: 45000,
    salaryMax: 58000,
    requirements: ['CompTIA A+ or Google IT Support cert', '1+ year IT support experience', 'Strong communication skills'],
    status: JobStatusEnum.live,
  },
  {
    title: 'Cloud Operations Engineer',
    description: 'Join our infrastructure team managing AWS environments for 50+ enterprise clients. AWS Cloud Practitioner or Solutions Architect certification required. You will be responsible for deployment automation, monitoring, and cost optimization.',
    location: 'Austin, TX',
    locationType: JobLocationType.onsite,
    jobType: JobTypeEnum.fulltime,
    salaryMin: 68000,
    salaryMax: 85000,
    requirements: ['AWS Cloud Practitioner or Solutions Architect cert', '2+ years cloud operations', 'Experience with Terraform or CloudFormation'],
    status: JobStatusEnum.live,
  },
  {
    title: 'Junior Data Analyst',
    description: 'Analyze client data and build dashboards using Python and SQL. Google Data Analytics certification strongly preferred. Part of our growing analytics practice serving healthcare and finance clients in the Austin area.',
    location: 'Remote',
    locationType: JobLocationType.remote,
    jobType: JobTypeEnum.fulltime,
    salaryMin: 52000,
    salaryMax: 65000,
    requirements: ['Google Data Analytics cert or equivalent', 'Proficiency in Python and SQL', 'Experience with Tableau or Looker'],
    status: JobStatusEnum.live,
  },
  {
    title: 'Cybersecurity Analyst (Tier 1 SOC)',
    description: 'Monitor security events, triage alerts, and escalate incidents for our 24/7 Security Operations Center. Google Cybersecurity or CompTIA Security+ certification required. Great entry point for career changers from WorkforceAP programs.',
    location: 'Austin, TX',
    locationType: JobLocationType.onsite,
    jobType: JobTypeEnum.fulltime,
    salaryMin: 55000,
    salaryMax: 72000,
    requirements: ['Google Cybersecurity or CompTIA Security+ cert', 'Understanding of SIEM tools', 'Attention to detail in high-volume environments'],
    status: JobStatusEnum.live,
  },
  {
    title: 'AI/ML Associate Engineer',
    description: 'Support our data science team building machine learning pipelines for enterprise clients. IBM AI Developer Certificate or equivalent coursework preferred. Python, scikit-learn, and basic model deployment experience valued.',
    location: 'Austin, TX',
    locationType: JobLocationType.hybrid,
    jobType: JobTypeEnum.fulltime,
    salaryMin: 72000,
    salaryMax: 92000,
    requirements: ['IBM AI Developer cert or equivalent', 'Python proficiency (scikit-learn, pandas)', 'Experience with ML model training and evaluation'],
    status: JobStatusEnum.pending,
  },
];

export const DEMO_AI_MATCHES = [
  // Jordan (IBM AI Dev) → AI/ML job
  { jobIdx: 4, memberEmail: 'demo-member@workforceap.org', score: 91, reasons: ['IBM AI Developer cert matches role requirements', 'Python proficiency demonstrated in assessment', 'ML fundamentals course completed'], status: AIJobMatchStatus.suggested },
  // Darnell (AWS) → Cloud Ops job
  { jobIdx: 1, memberEmail: 'darnell.hayes@demo.workforceap.org', score: 95, reasons: ['AWS Solutions Architect cert is exact match', 'Highest assessment score in cohort (91%)', 'Infrastructure experience from coursework'], status: AIJobMatchStatus.contacted },
  // Marcus (Cybersecurity) → Cybersecurity Analyst job
  { jobIdx: 3, memberEmail: 'marcus.bell@demo.workforceap.org', score: 93, reasons: ['Google Cybersecurity cert direct match', 'Completed all 8 modules with 88% assessment', 'Linux and Python skills from course'], status: AIJobMatchStatus.suggested },
  // Maria (IT Support) → IT Support Specialist
  { jobIdx: 0, memberEmail: 'maria.santos@demo.workforceap.org', score: 82, reasons: ['Google IT Support cert matches role', '79% assessment score', 'Networking module completed'], status: AIJobMatchStatus.suggested },
  // Priya (Data Analytics) → Junior Data Analyst
  { jobIdx: 2, memberEmail: 'priya.kumar@demo.workforceap.org', score: 77, reasons: ['Google Data Analytics cert in progress', 'Foundations module completed', 'Strong Excel/spreadsheet background'], status: AIJobMatchStatus.suggested },
  // Keisha (AWS) → Cloud Ops job (second match)
  { jobIdx: 1, memberEmail: 'keisha.washington@demo.workforceap.org', score: 87, reasons: ['AWS cert matches role', '82% assessment score', 'Already placed — showing for pipeline reference'], status: AIJobMatchStatus.hired },
];
