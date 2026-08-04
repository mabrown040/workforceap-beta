import type { PrismaClient } from '@prisma/client';

/**
 * Comprehensive O*NET occupation + program mapping seed data.
 *
 * Maps all 19 WorkforceAP programs to the O*NET occupations they prepare
 * graduates for. Used by the Skill Mapper, career quiz, and program pages
 * to show "this program → these careers" connections.
 *
 * Run full sync from /admin/career-mappings or POST /api/admin/onet/sync
 * when ONET_API_KEY is set to pull live salary, outlook, and skill data.
 */
export async function seedOnetCareerData(prisma: PrismaClient): Promise<void> {
  // ─── Occupations ───────────────────────────────────────────────
  const occupations: {
    code: string;
    title: string;
    description: string;
  }[] = [
    // IT & Support
    {
      code: '15-1232.00',
      title: 'Computer User Support Specialists',
      description: 'Help people solve computer problems, set up software, and keep day-to-day technology running smoothly.',
    },
    {
      code: '15-1231.00',
      title: 'Computer Network Support Specialists',
      description: 'Analyze, test, troubleshoot, and evaluate existing network systems such as LAN, WAN, and internet.',
    },
    // Security
    {
      code: '15-1212.00',
      title: 'Information Security Analysts',
      description: 'Protect systems and data from cyber threats, monitor security tools, and respond to incidents.',
    },
    // Software & Web Dev
    {
      code: '15-1252.00',
      title: 'Software Developers',
      description: 'Build and maintain applications, collaborate on features, and turn requirements into reliable software.',
    },
    {
      code: '15-1254.00',
      title: 'Web Developers',
      description: 'Design, create, and modify websites. Analyze user needs to implement website content, graphics, and performance.',
    },
    // Data & AI
    {
      code: '15-2051.00',
      title: 'Data Scientists',
      description: 'Apply data analysis, machine learning, and statistical methods to extract insights and solve business problems.',
    },
    {
      code: '15-1221.00',
      title: 'Computer and Information Analysts',
      description: 'Analyze data processing problems and develop solutions using computer systems and procedures.',
    },
    // Cloud & Network
    {
      code: '15-1244.00',
      title: 'Network and Computer Systems Administrators',
      description: 'Install, configure, and maintain organizations\' local area networks, wide area networks, and cloud systems.',
    },
    {
      code: '15-1241.00',
      title: 'Computer Network Architects',
      description: 'Design and implement computer and information networks, including local area networks and wide area networks.',
    },
    // Design
    {
      code: '15-1255.00',
      title: 'Web and Digital Interface Designers',
      description: 'Design digital user interfaces and experiences. Create wireframes, prototypes, and visual designs for websites and apps.',
    },
    // Business / Project Management
    {
      code: '13-1082.00',
      title: 'Project Management Specialists',
      description: 'Analyze and coordinate the schedule, timeline, and budget of a project. Lead teams to deliver projects on time.',
    },
    {
      code: '13-1111.00',
      title: 'Management Analysts',
      description: 'Advise organizations on how to operate more efficiently — studying processes, data, and costs to recommend improvements and implement change.',
    },
    // Marketing
    {
      code: '13-1161.00',
      title: 'Market Research Analysts and Marketing Specialists',
      description: 'Research market conditions to examine potential sales of a product or service. Gather data on competitors and consumers.',
    },
    {
      code: '27-3043.00',
      title: 'Writers and Authors',
      description: 'Write original content for advertising, marketing, publications, and digital platforms.',
    },
    // Healthcare / HIT
    {
      code: '29-2072.00',
      title: 'Medical Records Specialists',
      description: 'Compile, process, and maintain medical records in a manner consistent with medical, administrative, and legal requirements.',
    },
    {
      code: '29-9021.00',
      title: 'Health Information Technologists and Medical Registrars',
      description: 'Apply knowledge of health care and information technology to assist in the design and management of health information systems.',
    },
    // Manufacturing
    {
      code: '51-4041.00',
      title: 'Machinists',
      description: 'Set up and operate machine tools to produce precision metal and nonmetal parts, instruments, and tools.',
    },
    {
      code: '51-9061.00',
      title: 'Inspectors, Testers, Sorters, Samplers, and Weighers',
      description: 'Inspect, test, sort, sample, or weigh nonagricultural raw materials or processed goods for defects and quality.',
    },
    // Logistics
    {
      code: '13-1081.00',
      title: 'Logisticians',
      description: 'Analyze and coordinate the ongoing logistical functions including purchasing, transportation, and distribution.',
    },
    {
      code: '43-5071.00',
      title: 'Shipping, Receiving, and Inventory Clerks',
      description: 'Verify and maintain records of incoming and outgoing shipments. Prepare items for shipment.',
    },
    // Construction
    {
      code: '47-2061.00',
      title: 'Construction Laborers',
      description: 'Perform tasks involving physical labor at construction sites. Operate hand and power tools of all types.',
    },
    {
      code: '47-1011.00',
      title: 'First-Line Supervisors of Construction Trades and Extraction Workers',
      description: 'Directly supervise and coordinate activities of construction workers and helpers.',
    },
    // General office (digital literacy grads)
    {
      code: '43-9061.00',
      title: 'Office Clerks, General',
      description: 'Perform duties too varied to be classified in any single office clerical position, using digital tools and systems.',
    },
    {
      code: '43-4051.00',
      title: 'Customer Service Representatives',
      description: 'Interact with customers by phone, email, or chat to handle complaints, process orders, and provide information.',
    },
    // DevOps / Automation
    {
      code: '15-1299.08',
      title: 'Computer Systems Engineers/Architects',
      description: 'Design and develop solutions to complex applications problems, system administration issues, or network concerns.',
    },
    // Sales & Marketing
    {
      code: '41-4012.00',
      title: 'Sales Representatives, Wholesale and Manufacturing',
      description: 'Sell goods for wholesalers or manufacturers to businesses or groups. May require technical knowledge of the products.',
    },
    {
      code: '11-2021.00',
      title: 'Marketing Managers',
      description: 'Plan, direct, or coordinate marketing policies and programs, such as determining demand for products and services.',
    },
    {
      code: '11-2022.00',
      title: 'Sales Managers',
      description: 'Plan, direct, or coordinate the distribution of products or services to customers. Establish sales territories and goals.',
    },
  ];

  for (const o of occupations) {
    await prisma.onetOccupation.upsert({
      where: { onetCode: o.code },
      create: {
        onetCode: o.code,
        title: o.title,
        description: o.description,
        isActive: true,
      },
      update: {
        title: o.title,
        description: o.description,
      },
    });
  }

  // ─── Program ↔ Occupation Mappings ─────────────────────────────
  const mappings: {
    onetCode: string;
    programSlug: string;
    priority: number;
    experienceBand: 'beginner' | 'some_experience' | 'experienced';
    recommendationType: 'primary' | 'bridge' | 'stretch';
    whyRecommended: string;
  }[] = [
    // ── Digital Literacy ──
    {
      onetCode: '43-9061.00',
      programSlug: 'digital-literacy-empowerment-class',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'Builds essential computer and digital skills for general office and clerical roles.',
    },
    {
      onetCode: '43-4051.00',
      programSlug: 'digital-literacy-empowerment-class',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'Develops email, online safety, and communication skills for customer service.',
    },

    // ── AI Professional Developer (IBM) ──
    {
      onetCode: '15-2051.00',
      programSlug: 'ai-professional-developer-certificate-ibm',
      priority: 1,
      experienceBand: 'some_experience',
      recommendationType: 'primary',
      whyRecommended: 'Covers Python, AI/ML, and generative AI — core skills for data science roles.',
    },
    {
      onetCode: '15-1252.00',
      programSlug: 'ai-professional-developer-certificate-ibm',
      priority: 2,
      experienceBand: 'experienced',
      recommendationType: 'stretch',
      whyRecommended: 'Adds AI and modern development skills on top of core software engineering.',
    },

    // ── Software Developer (IBM) ──
    {
      onetCode: '15-1252.00',
      programSlug: 'software-developer-professional-certificate-ibm',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'Full-stack curriculum (HTML, CSS, JS, Python, React, Node) for software development careers.',
    },
    {
      onetCode: '15-1254.00',
      programSlug: 'software-developer-professional-certificate-ibm',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'Teaches front-end and back-end web development with React and Node.js.',
    },

    // ── AWS Cloud Technology ──
    {
      onetCode: '15-1244.00',
      programSlug: 'aws-cloud-technology-amazon',
      priority: 1,
      experienceBand: 'some_experience',
      recommendationType: 'primary',
      whyRecommended: 'Covers AWS cloud infrastructure, DevOps, and systems administration.',
    },
    {
      onetCode: '15-1241.00',
      programSlug: 'aws-cloud-technology-amazon',
      priority: 1,
      experienceBand: 'experienced',
      recommendationType: 'primary',
      whyRecommended: 'Teaches cloud architecture design aligned with AWS Well-Architected Framework.',
    },
    {
      onetCode: '15-1299.08',
      programSlug: 'aws-cloud-technology-amazon',
      priority: 2,
      experienceBand: 'experienced',
      recommendationType: 'stretch',
      whyRecommended: 'Builds DevOps and automation skills for systems engineering roles.',
    },

    // ── Data Analytics (Google) ──
    {
      onetCode: '15-1221.00',
      programSlug: 'data-analytics-professional-certificate-google',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'Teaches SQL, spreadsheets, R, and Tableau — core business analyst skills.',
    },
    {
      onetCode: '15-2051.00',
      programSlug: 'data-analytics-professional-certificate-google',
      priority: 2,
      experienceBand: 'some_experience',
      recommendationType: 'bridge',
      whyRecommended: 'Provides data analysis and visualization foundation for data science growth.',
    },
    {
      onetCode: '13-1111.00',
      programSlug: 'data-analytics-professional-certificate-google',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'Management consulting and business analysis coursework maps directly to entry-level management analyst roles.',
    },
    {
      onetCode: '13-1161.00',
      programSlug: 'data-analytics-professional-certificate-google',
      priority: 2,
      experienceBand: 'some_experience',
      recommendationType: 'bridge',
      whyRecommended: 'Data collection, cleaning, analysis, and visualization skills transfer directly to market research analysis.',
    },

    // ── Data Science (IBM) ──
    {
      onetCode: '15-2051.00',
      programSlug: 'data-science-professional-certificate-ibm',
      priority: 1,
      experienceBand: 'some_experience',
      recommendationType: 'primary',
      whyRecommended: 'Covers Python, SQL, machine learning, and Jupyter — directly aligned with data science roles.',
    },
    {
      onetCode: '15-1221.00',
      programSlug: 'data-science-professional-certificate-ibm',
      priority: 2,
      experienceBand: 'experienced',
      recommendationType: 'bridge',
      whyRecommended: 'Data analysis and machine learning skills applicable to analyst roles.',
    },

    // ── CompTIA A+ ──
    {
      onetCode: '15-1232.00',
      programSlug: 'comptia-a-professional-certificate',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'Industry-standard certification for IT support — hardware, networking, and OS fundamentals.',
    },

    // ── CompTIA Network+ ──
    {
      onetCode: '15-1231.00',
      programSlug: 'comptia-network-professional-certificate',
      priority: 1,
      experienceBand: 'some_experience',
      recommendationType: 'primary',
      whyRecommended: 'Deep networking skills (TCP/IP, Cisco, wireless) for network support specialist roles.',
    },
    {
      onetCode: '15-1244.00',
      programSlug: 'comptia-network-professional-certificate',
      priority: 2,
      experienceBand: 'experienced',
      recommendationType: 'bridge',
      whyRecommended: 'Networking fundamentals that lead into systems and network administration.',
    },

    // ── CompTIA Security+ ──
    {
      onetCode: '15-1212.00',
      programSlug: 'comptia-security-professional-certificate',
      priority: 1,
      experienceBand: 'some_experience',
      recommendationType: 'primary',
      whyRecommended: 'Network security, cryptography, and risk management for security analyst careers.',
    },

    // ── IT Support (IBM) ──
    {
      onetCode: '15-1232.00',
      programSlug: 'it-support-professional-certificate-ibm',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'Covers help desk, hardware, software, and cloud computing for entry-level IT support.',
    },

    // ── IT Automation with Python (Google) ──
    {
      onetCode: '15-1244.00',
      programSlug: 'it-automation-with-python-google',
      priority: 1,
      experienceBand: 'some_experience',
      recommendationType: 'primary',
      whyRecommended: 'Python scripting, Git, and cloud automation for sysadmin and DevOps roles.',
    },
    {
      onetCode: '15-1232.00',
      programSlug: 'it-automation-with-python-google',
      priority: 2,
      experienceBand: 'experienced',
      recommendationType: 'stretch',
      whyRecommended: 'Adds automation skills that elevate IT support into engineering territory.',
    },

    // ── Cybersecurity (Google) ──
    {
      onetCode: '15-1212.00',
      programSlug: 'cybersecurity-professional-certificate-google',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'Linux, SQL, Python, and incident response aligned with entry-level security analyst roles.',
    },

    // ── Project Management (Microsoft) ──
    {
      onetCode: '13-1082.00',
      programSlug: 'project-management-professional-certificate-microsoft',
      priority: 1,
      experienceBand: 'some_experience',
      recommendationType: 'primary',
      whyRecommended: 'Agile, Scrum, scheduling, and stakeholder management — directly maps to PM specialist roles.',
    },

    // ── Digital Marketing & E-Commerce (Google) ──
    {
      onetCode: '13-1161.00',
      programSlug: 'digital-marketing-e-commerce-google',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'SEO, SEM, email marketing, and analytics for marketing specialist careers.',
    },
    {
      onetCode: '27-3043.00',
      programSlug: 'digital-marketing-e-commerce-google',
      priority: 2,
      experienceBand: 'some_experience',
      recommendationType: 'bridge',
      whyRecommended: 'Content creation and copywriting skills for digital marketing writing roles.',
    },

    // ── UX Design (Google) ──
    {
      onetCode: '15-1255.00',
      programSlug: 'ux-design-professional-certificate-google',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'User research, wireframing, Figma, and prototyping for UX/UI design careers.',
    },
    {
      onetCode: '15-1254.00',
      programSlug: 'ux-design-professional-certificate-google',
      priority: 2,
      experienceBand: 'some_experience',
      recommendationType: 'bridge',
      whyRecommended: 'UX design skills highly valued in web development teams.',
    },

    // ── Medical Coding & HIT ──
    {
      onetCode: '29-2072.00',
      programSlug: 'health-information-technology-mchit',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'ICD-10 coding, EHR, HIPAA, and revenue cycle management for medical records careers.',
    },
    {
      onetCode: '29-9021.00',
      programSlug: 'health-information-technology-mchit',
      priority: 1,
      experienceBand: 'some_experience',
      recommendationType: 'primary',
      whyRecommended: 'Health information technology and management skills for HIT roles.',
    },

    // ── Certified Production Technician ──
    {
      onetCode: '51-4041.00',
      programSlug: 'certified-production-technician-cpt',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'CNC operations, machining, and quality control for precision manufacturing careers.',
    },
    {
      onetCode: '51-9061.00',
      programSlug: 'certified-production-technician-cpt',
      priority: 2,
      experienceBand: 'some_experience',
      recommendationType: 'bridge',
      whyRecommended: 'Quality control and inspection skills from lean manufacturing training.',
    },

    // ── Certified Logistics Technician ──
    {
      onetCode: '13-1081.00',
      programSlug: 'certified-logistics-technician-clt',
      priority: 1,
      experienceBand: 'some_experience',
      recommendationType: 'primary',
      whyRecommended: 'Supply chain management, SAP, procurement, and global trade for logistician careers.',
    },
    {
      onetCode: '43-5071.00',
      programSlug: 'certified-logistics-technician-clt',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'Warehouse operations, inventory management, and shipping for entry-level logistics.',
    },

    // ── Digital Marketing → Sales & Marketing roles ──
    {
      onetCode: '11-2021.00',
      programSlug: 'digital-marketing-e-commerce-google',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'SEO, SEM, email marketing, and analytics directly aligned with marketing manager responsibilities.',
    },
    {
      onetCode: '41-4012.00',
      programSlug: 'digital-marketing-e-commerce-google',
      priority: 2,
      experienceBand: 'some_experience',
      recommendationType: 'bridge',
      whyRecommended: 'Digital marketing and e-commerce skills are core tools for modern sales representatives.',
    },

    // ── Project Management → Sales Management ──
    {
      onetCode: '11-2022.00',
      programSlug: 'project-management-professional-certificate-microsoft',
      priority: 2,
      experienceBand: 'experienced',
      recommendationType: 'bridge',
      whyRecommended: 'Agile, stakeholder management, and resource planning skills apply directly to sales team leadership.',
    },

    // ── Construction Readiness (OSHA-10) ──
    {
      onetCode: '47-2061.00',
      programSlug: 'core-construction-training-certificate',
      priority: 1,
      experienceBand: 'beginner',
      recommendationType: 'primary',
      whyRecommended: 'OSHA-10 safety certification, blueprint reading, and construction fundamentals.',
    },
    {
      onetCode: '47-1011.00',
      programSlug: 'core-construction-training-certificate',
      priority: 2,
      experienceBand: 'experienced',
      recommendationType: 'stretch',
      whyRecommended: 'Safety training and construction knowledge foundational for supervisory roles.',
    },
  ];

  for (const m of mappings) {
    const existing = await prisma.careerProgramMapping.findFirst({
      where: {
        onetCode: m.onetCode,
        programSlug: m.programSlug,
        experienceBand: m.experienceBand,
      },
    });
    if (existing) {
      await prisma.careerProgramMapping.update({
        where: { id: existing.id },
        data: {
          priority: m.priority,
          recommendationType: m.recommendationType,
          whyRecommended: m.whyRecommended,
          isActive: true,
        },
      });
    } else {
      await prisma.careerProgramMapping.create({
        data: {
          onetCode: m.onetCode,
          programSlug: m.programSlug,
          priority: m.priority,
          experienceBand: m.experienceBand,
          recommendationType: m.recommendationType,
          whyRecommended: m.whyRecommended,
          isActive: true,
        },
      });
    }
  }

  // ─── Quiz boost rules ──────────────────────────────────────────
  const quizRules: {
    ruleKey: string;
    inputSignal: Record<string, string>;
    boostOnetCode: string;
    weight: number;
    reasonText: string;
  }[] = [
    {
      ruleKey: 'boost_computers_q1',
      inputSignal: { q1: 'computers' },
      boostOnetCode: '15-1232.00',
      weight: 2,
      reasonText: 'Extra weight when user selects technology interest.',
    },
    {
      ruleKey: 'boost_data_q1',
      inputSignal: { q1: 'data' },
      boostOnetCode: '15-2051.00',
      weight: 2,
      reasonText: 'Extra weight for data/analytics interest.',
    },
    {
      ruleKey: 'boost_security_q1',
      inputSignal: { q1: 'security' },
      boostOnetCode: '15-1212.00',
      weight: 2,
      reasonText: 'Extra weight for cybersecurity interest.',
    },
    {
      ruleKey: 'boost_healthcare_q1',
      inputSignal: { q1: 'healthcare' },
      boostOnetCode: '29-2072.00',
      weight: 2,
      reasonText: 'Extra weight for healthcare interest.',
    },
    {
      ruleKey: 'boost_construction_q1',
      inputSignal: { q1: 'construction' },
      boostOnetCode: '47-2061.00',
      weight: 2,
      reasonText: 'Extra weight for construction/trades interest.',
    },
    {
      ruleKey: 'boost_design_q1',
      inputSignal: { q1: 'design' },
      boostOnetCode: '15-1255.00',
      weight: 2,
      reasonText: 'Extra weight for design/creative interest.',
    },
    {
      ruleKey: 'boost_business_q1',
      inputSignal: { q1: 'business' },
      boostOnetCode: '13-1082.00',
      weight: 2,
      reasonText: 'Extra weight for business/management interest.',
    },
    {
      ruleKey: 'boost_sales_q1',
      inputSignal: { q1: 'sales' },
      boostOnetCode: '41-4012.00',
      weight: 2,
      reasonText: 'Extra weight for sales/account management interest.',
    },
    {
      ruleKey: 'boost_marketing_managers_q1',
      inputSignal: { q1: 'marketing' },
      boostOnetCode: '11-2021.00',
      weight: 2,
      reasonText: 'Extra weight when user selects marketing interest (manager track).',
    },
  ];

  for (const r of quizRules) {
    await prisma.careerQuizRule.upsert({
      where: { ruleKey: r.ruleKey },
      create: {
        ruleKey: r.ruleKey,
        inputSignal: r.inputSignal,
        boostOnetCode: r.boostOnetCode,
        weight: r.weight,
        reasonText: r.reasonText,
        isActive: true,
      },
      update: {
        inputSignal: r.inputSignal,
        boostOnetCode: r.boostOnetCode,
        weight: r.weight,
        reasonText: r.reasonText,
        isActive: true,
      },
    });
  }

  console.log(
    `Seeded ${occupations.length} O*NET occupations, ${mappings.length} program mappings, ${quizRules.length} quiz rules`
  );
}
