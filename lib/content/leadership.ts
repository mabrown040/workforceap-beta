/**
 * Board & leadership — shared by /leadership and /leadership/[slug]
 */

export type LeaderBioBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'bullets'; items: string[] };

export type LeaderStat = {
  label: string;
  value: string;
};

export type Leader = {
  slug: string;
  name: string;
  role: string;
  title: string;
  image: string;
  founder: boolean;
  linkedin: string;
  /** Short excerpt for the card grid */
  cardBio: string;
  bioBlocks: LeaderBioBlock[];
  stats: LeaderStat[];
};

export const LEADERS: Leader[] = [
  {
    slug: 'michael-brown',
    name: 'Michael A. Brown, PMP, ChE',
    role: 'Executive Director, CEO',
    title: 'Executive Director & Chief Executive Officer',
    image: '/images/michael-brown.jpg',
    founder: true,
    linkedin: 'https://www.linkedin.com/in/michaelabrownpmp/',
    cardBio:
      "Michael A. Brown, PMP, ChE, is a highly accomplished business executive with a distinguished career spanning several decades in business development, project management, and education. Michael holds a Chemical Engineering degree from Texas A&M University and as a former owner of Consulting Solutions.Net and key leader at State of Texas Career Schools, Goodwill Central Texas, Austin Urban League, Universal Tech Movement, African American Youth Harvest Foundation he has consistently driven organizational excellence across public and private sectors. A devoted community leader, Michael is an elder at Celebration Church and an active board member of Concordia High School and also member of 100 Black Men of Austin and Alpha Phi Alpha Fraternity.",
    bioBlocks: [
      {
        type: 'paragraph',
        text:
          'Michael Brown, PMP, is a highly accomplished business executive with a distinguished career spanning several decades. He brings a wealth of expertise in business development, project management, and education, consistently driving organizational excellence across the public and private sectors. As the former owner of Consulting Solutions.Net and a key leader at the State of Texas Career Schools, Goodwill Central Texas, and the Austin Urban League, Michael has repeatedly demonstrated his ability to propel business growth through thoughtful strategic planning, operational innovation, and continuous improvement.',
      },
      {
        type: 'paragraph',
        text:
          'Throughout his career, Michael has successfully delivered transformative results by leveraging his comprehensive knowledge of business systems and a disciplined approach to strategic marketing and operational processes. His leadership has yielded significant growth and profitability for organizations, with a proven ability to forge successful partnerships across government and private sectors alike.',
      },
      {
        type: 'paragraph',
        text:
          'Beyond his professional endeavors, Michael is deeply committed to community engagement and personal values. A devoted husband of 33 years and proud father of two adult children, his dedication to service is reflected in his active membership with the esteemed 100 Black Men of Austin, his lifelong brotherhood with Alpha Phi Alpha Fraternity, and his role as an Elder at Celebration Church.',
      },
      {
        type: 'paragraph',
        text:
          "Michael's diverse expertise encompasses operations management, business development, sales, account management, staffing, and employee training. His ability to integrate sound business acumen with a technical understanding of project management has driven the implementation of highly effective systems that optimize performance, efficiency, and profitability.",
      },
      {
        type: 'paragraph',
        text:
          'In summary, Michael Brown is a dynamic and visionary leader, committed family man, and community advocate. His proven track record of delivering exceptional outcomes underscores his reputation as a trusted business partner and industry leader.',
      },
    ],
    stats: [
      { label: 'Family', value: '33 years married' },
      { label: 'Community', value: '100 Black Men of Austin' },
      { label: 'Fraternity', value: 'Alpha Phi Alpha Fraternity' },
      { label: 'Faith', value: 'Elder at Celebration Church' },
    ],
  },
  {
    slug: 'adriane-brown',
    name: 'Adriane Brown',
    role: 'Chief Operating Officer',
    title: 'Chief Operating Officer',
    image: '/images/adriane-brown.jpg',
    founder: false,
    linkedin: 'https://www.linkedin.com/in/adriane-brown/',
    cardBio:
      'Adriane Brown is a strategic business and operations leader with over 25 years of experience driving organizational growth and operational excellence. A Texas A&M graduate, she has led enterprise operations to national reach and brings deep expertise in business development, compliance, and performance optimization. She completed Microsoft Project Management Certification in 2025 and serves as Women\'s Ministry Leader at Celebration Church.',
    bioBlocks: [
      {
        type: 'paragraph',
        text:
          'Adriane Brown is a strategic business and operations leader with more than 25 years of experience driving organizational growth, operational excellence, and large-scale initiative execution. A graduate of Texas A&M University with a Bachelor of Business Administration in Management Information Systems, she began her career with IBM and Accenture, contributing to the development of statewide technology systems for the State of Texas, including tax and child support platforms.',
      },
      {
        type: 'paragraph',
        text:
          'Adriane later co-led the growth of multiple enterprises under the Brown & Associates family of companies, helping scale operations to national reach. She brings deep expertise in business development, infrastructure organization, client relations, systems restructuring, compliance readiness, and performance optimization.',
      },
      {
        type: 'paragraph',
        text:
          'As Business/Client Relations Manager for a State of Texas TWC Career School, Adriane played a key role in strategic planning, audit preparation, intake process redesign, and student performance tracking—ensuring operational efficiency and measurable results. In 2025, she completed the Microsoft Project Management Certification, further strengthening her ability to lead complex initiatives using structured methodologies and best practices.',
      },
      {
        type: 'paragraph',
        text:
          "In addition to her business development work, Adriane serves as a Women's Ministry Leader at Celebration Church and is co-author of Women of Distinction and Grace. Known for her disciplined execution, collaborative leadership style, and results-driven mindset, Adriane partners with organizations to build scalable systems, elevate performance, and position teams for sustainable, long-term growth.",
      },
    ],
    stats: [
      { label: 'Experience', value: '25+ years' },
      { label: 'Education', value: 'Texas A&M Graduate' },
      { label: 'Certification', value: 'Microsoft Project Management (2025)' },
      { label: 'Faith', value: "Women's Ministry Leader" },
    ],
  },
  {
    slug: 'lakecia-gunter',
    name: 'Lakecia Gunter',
    role: 'Board Member',
    title: 'Board Member',
    image: '/images/lakecia-gunter.jpg',
    founder: false,
    linkedin: 'https://www.linkedin.com/in/lakecia-gunter/',
    cardBio:
      "Lakecia Gunter is a 25-year tech industry veteran serving as Chief Technology Officer, Global Partner Solutions at Microsoft. Honored as a Finalist in SUCCESS Magazine's 2023 Women of Influence, she is a nationally recognized engineer, speaker, and advocate for women in technology. She holds an MS in Electrical Engineering from Georgia Tech and currently serves on the Board of Directors at IDEX Corporation.",
    bioBlocks: [
      {
        type: 'paragraph',
        text:
          'Lakecia Gunter is a 25-year tech industry veteran, leading Chief Technology Officer, and sought-after expert on New Business Strategy, Growth, and Technical Innovation, Global Partner Sales, and Artificial Intelligence. Known for her personal drive and technical leadership, Lakecia has worked in both the U.S. Federal Government and global Fortune 50 companies—including early years as a digital logic designer, program manager at the Department of Defense, then as Chief of Staff to the CEO of Intel—and now as Chief Technology Officer, Global Partner Solutions at Microsoft.',
      },
      {
        type: 'paragraph',
        text:
          'In 2023, Lakecia was honored as a Finalist in SUCCESS Magazine\'s 2023 Women of Influence, along with 49 other celebrated women, for their "remarkable achievements, innovation, and impact on their communities and industries—and the personal and professional lives of others." #VoicesofToday #VisionariesofTomorrow',
      },
      {
        type: 'paragraph',
        text:
          'A nationally recognized, award-winning engineer and speaker, Lakecia is a people-first leader, who seeks to strengthen organizational cultures and develop current and aspiring engineers and leaders. She is widely-regarded as a visionary with proven ability to build relationships with stakeholders to achieve business goals, develop business strategies that translate into action, and identify market trends and paradigm shifts to deliver revenue growth and bring value to end-users.',
      },
      {
        type: 'paragraph',
        text:
          'A life-long advocate for women, Lakecia recently reached out to broader audiences as Founder and Podcast Host of "ROAR with Lakecia Gunter", her weekly dose of inspirational stories, candid insights, and breakthrough resources that put women on the path to achieve more in work and life.',
      },
      {
        type: 'paragraph',
        text:
          'Lakecia currently serves on the Board of Directors at IDEX Corporation. She recently attended Stanford Directors\' College - Corporate Board Program. She earned a MS Electrical Engineering from Georgia Institute of Technology, and her BS Computer Engineering at the University of South Florida. She launched her career in high school in Florida at a local KFC franchise, where a local couple spotted her leadership potential. She never forgot their generosity. It informs her desire to help others achieve their highest potential every day.',
      },
    ],
    stats: [
      { label: 'Industry', value: '25 years in tech' },
      { label: 'Role', value: 'CTO at Microsoft' },
      { label: 'Recognition', value: 'SUCCESS Magazine Women of Influence 2023' },
      { label: 'Governance', value: 'Board Director, IDEX Corporation' },
    ],
  },
  {
    slug: 'derrick-fishback',
    name: 'Col. Derrick Fishback',
    role: 'Board Member (Ret.)',
    title: 'Board Member',
    image: '/images/derrick-fishback.jpg',
    founder: false,
    linkedin: 'https://www.linkedin.com/in/derrick-fishback/',
    cardBio:
      "Colonel Derrick Fishback (Retired) is a transformational leader with nearly three decades of U.S. Army service complemented by leadership roles at Fortune 500 companies. He has commanded 1,800+ personnel and led cloud transformation initiatives at Amazon Web Services, IBM, and Dell. Derrick holds two master's degrees and serves as Board President of the Jazz Society of Pensacola.",
    bioBlocks: [
      {
        type: 'paragraph',
        text:
          'Derrick Fishback is a transformational leader with nearly three decades of U.S. Army service complemented by leadership and consulting roles in Fortune 500 companies.',
      },
      {
        type: 'paragraph',
        text:
          'He has commanded organizations of 1,800 personnel, managed multimillion-dollar budgets, and driven complex, globally coordinated initiatives. His military career includes pivotal leadership and advisory assignments with Joint U.S. Military and NATO forces during the Ukrainian crisis, Ebola pandemic, and Syrian refugee crisis—developing civil-military frameworks that remain operational standards today. Notably his civil engagement programs have impacted over 24 countries globally.',
      },
      {
        type: 'paragraph',
        text:
          'He also served in Afghanistan during Operation Enduring Freedom, contributing to mission-critical operations in challenging environments. Derrick holds two master\'s degrees—one from the University of Maryland and another from the U.S. Army War College—along with graduate certificates from Harvard University, the University of Geneva (Switzerland), the University of London, and Erasmus University (Netherlands), all reflecting a deep commitment to strategic thinking and global perspectives.',
      },
      {
        type: 'paragraph',
        text:
          'In the technology sector, Derrick led cloud transformation and AI/ML initiatives as Engagement Manager at Amazon Web Services and delivered enterprise solutions at IBM and Dell. He excels at bridging technical innovation with strategic vision, translating complex capabilities into measurable business outcomes and organizational growth.',
      },
      {
        type: 'paragraph',
        text:
          'Beyond his military and corporate achievements, Derrick brings nonprofit governance experience as Board President of the Jazz Society of Pensacola and Board Member of the Pensacola Symphony Orchestra. His leadership advances organizational sustainability, stakeholder engagement, and cultural impact.',
      },
    ],
    stats: [
      { label: 'Military', value: '30 years U.S. Army service' },
      { label: 'Command', value: 'Commanded 1,800+ personnel' },
      { label: 'Education', value: "2 Master's degrees" },
      { label: 'Nonprofit', value: 'Board President, Jazz Society of Pensacola' },
    ],
  },
  {
    slug: 'brandon-frye',
    name: 'Brandon Frye',
    role: 'Board Member',
    title: 'Board Member',
    image: '/images/brandon-frye.jpg',
    founder: false,
    linkedin: 'https://www.linkedin.com/in/brandon-frye-3238871/',
    cardBio:
      'Brandon Frye is a seasoned entrepreneur and business operator with extensive experience founding, investing in, and leading high-growth companies. He co-founded Interstate Connections (named "Fastest Growing Private Company" by Austin Business Journal) and currently serves as CFO of The Business Bible. Brandon is deeply involved in community leadership, serving on multiple boards including Texas Alliance for Life.',
    bioBlocks: [
      {
        type: 'paragraph',
        text:
          'Brandon Frye is a seasoned entrepreneur and business operator with extensive experience in founding, investing in, and leading high-growth companies. His expertise spans strategic business development, service integration, due diligence, and operational execution, with a proven track record of driving revenue and solving complex business challenges.',
      },
      { type: 'heading', text: 'Professional Highlights' },
      {
        type: 'bullets',
        items: [
          'Entrepreneurial Success: Co-founded and helped lead Interstate Connections, earning the distinction of "Fastest Growing Private Company" from the Austin Business Journal.',
          'Current Leadership: Serves as the CFO of The Business Bible and is a partner in Landgraf Wagyu Ranch and Austin Pole Vault.',
          'Investment Portfolio: Actively invests in diverse business opportunities, with a primary focus on the real estate sector.',
        ],
      },
      { type: 'heading', text: 'Board Service & Community Leadership' },
      {
        type: 'paragraph',
        text:
          'Beyond his professional endeavors, Brandon is deeply involved in community leadership and governance:',
      },
      {
        type: 'bullets',
        items: [
          'Texas Alliance for Life: Board of Directors and Chairman of the Strategic Budget and Finance Committee.',
          'Twent20 Faith: Former member of the Board of Directors.',
          'Concordia High School: Former Chairman of the Board of Directors.',
        ],
      },
      { type: 'heading', text: 'Personal Life' },
      {
        type: 'paragraph',
        text:
          'A lifelong athlete, Brandon has completed over 20 triathlons, including Ironman Arizona and Ironman Florida, as well as the New York City Marathon and the Leadville 100 Mountain Bike Challenge. He currently resides in Austin, Texas, with his wife of twenty-nine years and their three daughters.',
      },
    ],
    stats: [
      { label: 'Entrepreneurship', value: 'Co-founded Interstate Connections (Fastest Growing Private Co)' },
      { label: 'Leadership', value: 'CFO of The Business Bible' },
      { label: 'Athletics', value: '20+ triathlons completed' },
      { label: 'Endurance', value: 'Ironman Arizona & Florida finisher' },
    ],
  },
];

export function getLeaderBySlug(slug: string): Leader | undefined {
  return LEADERS.find((l) => l.slug === slug);
}
