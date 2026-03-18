import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const posts = [
  {
    slug: 'breaking-into-tech-starting-over',
    title: 'Breaking Into Tech: What No One Tells You About Starting Over',
    category: 'Career Tips',
    excerpt:
      "The hardest part isn't learning to code — it's believing the door is open for you.",
    authorName: 'WorkforceAP Team',
    published: true,
    publishedAt: new Date('2026-03-01'),
    content: `Starting over is terrifying. Whether you're 28 or 48, walking away from what you know to chase something new takes a kind of courage most people underestimate.

But here's what the job postings don't tell you: the tech industry has a massive entry-level gap. Companies need help desk technicians, junior data analysts, IT support specialists, and cybersecurity analysts — and they're not finding enough qualified people.

That's where certifications change the game. A Google Cybersecurity Certificate or CompTIA A+ doesn't just teach you skills — it signals to an employer that you took initiative, completed a rigorous program, and know the fundamentals. That signal matters more than a four-year degree for many of these roles.

The mental shift required is real. You'll feel like a beginner again. You'll compare yourself to people who've been in tech for years. But the people who make it through are the ones who stop waiting to feel ready and just start.

WorkforceAP exists for exactly this moment. We provide the structure, support, and credentials to help you take that first step — and we don't let you take it alone.`,
  },
  {
    slug: 'google-cybersecurity-certificate-worth-it',
    title: "What Is Google's Cybersecurity Certificate — And Is It Worth It?",
    category: 'Program Spotlight',
    excerpt:
      "Six months. No experience required. A job title that commands $75K+. Here's what you need to know.",
    authorName: 'WorkforceAP Team',
    published: true,
    publishedAt: new Date('2026-03-05'),
    content: `Google's Cybersecurity Professional Certificate is one of the most talked-about credentials in the workforce development space right now — and for good reason.

In roughly 3–5 months (at 10 hours per week), you'll cover the fundamentals of cybersecurity: risk management, network security, Linux, SQL, Python scripting, and incident response. The program is designed for absolute beginners. No prior tech experience required.

**What you'll earn:** Upon completion, you receive the Google Cybersecurity Certificate, which is recognized by hundreds of employers through Google's employer consortium.

**What employers pay:** Entry-level cybersecurity roles in Texas typically start between $75,000 and $112,000 depending on the specific title and organization.
**Is it worth it?** If you're willing to put in the work, yes. The certificate alone won't get you hired — but paired with the interview prep, resume support, and job placement assistance WorkforceAP provides, it becomes a real career launchpad.

The 8-course curriculum includes hands-on labs, portfolio projects, and exam prep. By the end, you'll have the skills and credentials to pursue roles like Security Analyst, SOC Analyst, or IT Security Specialist.`,
  },
  {
    slug: 'from-warehouse-to-it-support-marcus-story',
    title: "From Warehouse to IT Support: Marcus's Story",
    category: 'Success Stories',
    excerpt:
      "He spent 12 years in logistics. Six months later, he's a certified IT technician with a new career trajectory.",
    authorName: 'WorkforceAP Team',
    published: true,
    publishedAt: new Date('2026-03-10'),
    content: `Marcus spent 12 years working in logistics and warehouse management in the Austin area. He was good at his job — but after a facility closure in 2024, he found himself at a crossroads.

"I always liked technology," Marcus said. "I was always the guy people called when something broke. I just never thought I could make a career out of it."

At 34, Marcus enrolled in the CompTIA A+ program through WorkforceAP. He committed to 10 hours a week around his part-time schedule.

Five months later, he passed both CompTIA A+ Core exams on his first attempt.

Within six weeks of certification, Marcus accepted a Help Desk Technician role at an Austin-area managed services provider — a 40% increase over his previous warehouse salary.

"The hardest part was believing I could actually do it," he said. "WorkforceAP made it real. The structure, the support — I didn't feel like I was doing it alone."

Marcus is now pursuing his CompTIA Network+ certification and has his eye on a systems administrator role within two years.`,
  },
  {
    slug: '5-certifications-under-6-months',
    title: '5 High-Demand Certifications You Can Earn in Under 6 Months',
    category: 'Career Tips',
    excerpt:
      "The job market rewards speed and credentials. Here are the five certs employers are hiring for right now.",
    authorName: 'WorkforceAP Team',
    published: true,
    publishedAt: new Date('2026-03-12'),
    content: `The fastest path from unemployed to employed in tech isn't a four-year degree — it's a targeted certification. Here are five credentials employers are actively hiring for, all completable in under six months.

**1. Google Cybersecurity Professional Certificate**
3–5 months | Starting salary $75K–$112K
Covers network security, Linux, Python, and incident response. One of the most recognized entry-level cybersecurity credentials on the market.

**2. CompTIA A+**
3–5 months | Starting salary $55K–$78K
The gold standard for IT support and help desk roles. Two exams covering hardware, networking, operating systems, and security fundamentals.

**3. AWS Cloud Technology (Amazon)**
3–5 months | Starting salary $95K–$145K
Cloud is everywhere. This program covers AWS architecture, DevOps, Python, and data analytics — and Amazon's name on your resume opens doors.

**4. IBM Data Science Professional Certificate**
3–5 months | Starting salary $88K–$130K
Python, SQL, machine learning, and Jupyter notebooks. Data science skills are in demand across every industry.

**5. Google Project Management Certificate**
3–5 months | Starting salary $82K–$112K
Agile, Scrum, risk management, and MS Project. Project management credentials transfer across industries — tech, healthcare, construction, and more.

All five programs are available through WorkforceAP. Qualifying applicants may be eligible for funded enrollment.`,
  },
  {
    slug: 'austin-best-city-launch-tech-career',
    title: 'Why Austin Is One of the Best Cities to Launch a Tech Career',
    category: 'Local',
    excerpt:
      "Dell, Tesla, Apple, Google — Austin's tech scene is booming. Here's how to get in.",
    authorName: 'WorkforceAP Team',
    published: true,
    publishedAt: new Date('2026-03-15'),
    content: `Austin has quietly become one of the most important tech hubs in the United States — and if you live here, that's an opportunity you shouldn't ignore.

In the past decade, the Austin metro has seen explosive growth in technology employment. Dell has been here for decades. Tesla, Apple, Google, Oracle, and dozens of high-growth startups have all established major presences in the area. The result: a surging demand for tech workers at every level.

The challenge is that many of these opportunities go to experienced professionals from other cities. Entry-level Austin residents — especially those from underserved communities — often don't have the credentials to compete.
That's exactly what WorkforceAP is built to fix.

Our programs are specifically designed for Austin-area residents who want to break into tech, healthcare, or skilled trades. We provide industry-recognized certifications, wrap-around support, and job placement assistance — all geared toward connecting Austin talent with Austin employers.

The demand is here. The jobs are here. The only thing standing between you and a career in tech is the right credential and the right support system.

We're ready when you are.`,
  },
];

export async function seedBlogPosts() {
  console.log('Seeding blog posts...');
  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: post,
      create: post,
    });
    console.log(`✓ ${post.title}`);
  }
  console.log('Blog seed complete.');
}

// Run standalone when executed directly (db:seed:blog)
const isMain = process.argv[1]?.includes('seed-blog');
if (isMain) {
  seedBlogPosts()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
