/**
 * Checkpoint packs — business, design, and digital-literacy programs.
 *
 * Covers: Project Management (Microsoft), Digital Marketing & E-commerce (Google),
 * UX Design (Google), and the Workforce AP Digital Literacy Course.
 * See ./types.ts for the content rules these checkpoints follow.
 */

import type { ProgramCheckpointPack } from './types';

export const BUSINESS_AND_DESIGN_PACKS: ProgramCheckpointPack[] = [
  // ==========================================================================
  // PROJECT MANAGEMENT (Microsoft)
  // ==========================================================================
  {
    programSlug: 'project-management-professional-certificate-microsoft',
    programTitle: 'Project Management Professional Certificate',
    whyItMatters:
      'Hiring managers want proof you can keep real projects on time and on budget — these checkpoints show you can.',
    courses: [
      {
        courseSlug: 'pm-course-1',
        courseName: 'Project Management Foundations',
        programSlug: 'project-management-professional-certificate-microsoft',
        checkpoints: [
          {
            id: 'pm-course-1-cp-1',
            courseSlug: 'pm-course-1',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Tell a project apart from everyday work',
            onetSkills: ['Coordination'],
            scenario:
              'Your manager asks you to set up a new customer help desk by March, then asks you to also answer support calls every day. She says, "Treat both as your project."',
            question: 'Which task is actually a project?',
            options: [
              { id: 'a', text: 'Answering support calls, because it happens every day' },
              { id: 'b', text: 'Setting up the help desk, because it has a clear goal and end date' },
              { id: 'c', text: 'Both, because your manager assigned both' },
              { id: 'd', text: 'Neither, because projects need a big budget' },
            ],
            correctOptionId: 'b',
            explanation:
              'A project is temporary, with a defined goal and an end date. Answering calls is ongoing operations — it never "finishes," so it is not a project.',
            level: 'foundation',
          },
          {
            id: 'pm-course-1-cp-2',
            courseSlug: 'pm-course-1',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Spot when scope, time, and cost are out of balance',
            onetSkills: ['Management of Material Resources'],
            scenario:
              'You are managing a small office move. The owner suddenly wants two extra rooms painted, but the move date and budget stay the same.',
            question: 'What should you tell the owner first?',
            options: [
              { id: 'a', text: 'Adding work without more time or money puts the deadline at risk — something has to give' },
              { id: 'b', text: 'Yes — the team will just work faster' },
              { id: 'c', text: 'No — changes are never allowed once a project starts' },
              { id: 'd', text: 'Skip telling the owner and quietly drop another task' },
            ],
            correctOptionId: 'a',
            explanation:
              'Scope, time, and cost are connected. If scope grows, time or cost must grow too. Promising "we will work faster" hides the risk, and quietly dropping work breaks trust.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'pm-course-2',
        courseName: 'Initiating and Planning Projects',
        programSlug: 'project-management-professional-certificate-microsoft',
        checkpoints: [
          {
            id: 'pm-course-2-cp-1',
            courseSlug: 'pm-course-2',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Know what belongs in a project charter',
            onetSkills: ['Systems Analysis'],
            scenario:
              'You are starting a project to launch a food pantry website. Before any work begins, your sponsor asks you to write a one-page document that gives the project the green light.',
            question: 'What is the most important thing this charter should include?',
            options: [
              { id: 'a', text: 'The project goal, who the sponsor is, and your authority to start' },
              { id: 'b', text: 'A detailed day-by-day task schedule' },
              { id: 'c', text: 'The website code and design files' },
              { id: 'd', text: 'A list of every possible bug' },
            ],
            correctOptionId: 'a',
            explanation:
              'A charter authorizes the project: goal, sponsor, and the project manager’s authority. Detailed schedules come later, during planning — not in the charter.',
            level: 'foundation',
          },
          {
            id: 'pm-course-2-cp-2',
            courseSlug: 'pm-course-2',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Identify and prioritize stakeholders',
            onetSkills: ['Judgment and Decision Making'],
            scenario:
              'You are planning a new employee training program. The CEO funds it, HR will run it, employees will take it, and the IT team hosts the videos. You can only meet with two groups this week.',
            question: 'Who should you meet with first?',
            options: [
              { id: 'a', text: 'The CEO and HR — they have the most power and involvement' },
              { id: 'b', text: 'Only IT — technology problems are the hardest' },
              { id: 'c', text: 'Nobody — meetings slow projects down' },
              { id: 'd', text: 'Random employees, because there are more of them' },
            ],
            correctOptionId: 'a',
            explanation:
              'You prioritize stakeholders by power and interest. The funder and the team running the program shape the project most, so engage them first — then plan how to involve the rest.',
            level: 'applied',
          },
          {
            id: 'pm-course-2-cp-3',
            courseSlug: 'pm-course-2',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Define scope so the team knows what is in and out',
            onetSkills: ['Complex Problem Solving'],
            scenario:
              'Halfway through building a clinic scheduling app, a nurse asks you to also add billing. Your scope statement says the project covers "appointment scheduling only."',
            question: 'What is the right move?',
            options: [
              { id: 'a', text: 'Add billing now — the customer is always right' },
              { id: 'b', text: 'Log it as a change request and review its impact before deciding' },
              { id: 'c', text: 'Say no and never mention it again' },
              { id: 'd', text: 'Build billing secretly as a surprise' },
            ],
            correctOptionId: 'b',
            explanation:
              'New requests go through change control: capture the request, assess impact on time and cost, then decide with the sponsor. Just adding it is scope creep; flatly ignoring it loses a possibly good idea.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'pm-course-3',
        courseName: 'Project Scheduling and Cost Management',
        programSlug: 'project-management-professional-certificate-microsoft',
        checkpoints: [
          {
            id: 'pm-course-3-cp-1',
            courseSlug: 'pm-course-3',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Use the critical path to protect a deadline',
            onetSkills: ['Time Management', 'Mathematics'],
            scenario:
              'Your event project has two task chains: booking the venue takes 10 days total, and printing flyers takes 4 days total. The venue chain is your longest path.',
            question: 'A teammate on the venue tasks falls 2 days behind. What happens?',
            options: [
              { id: 'a', text: 'Nothing — only flyer delays matter' },
              { id: 'b', text: 'The whole project finishes 2 days late unless you act' },
              { id: 'c', text: 'The flyers will also automatically be late' },
              { id: 'd', text: 'The budget doubles' },
            ],
            correctOptionId: 'b',
            explanation:
              'The critical path is the longest chain of tasks — any delay on it delays the whole project. Tasks off the critical path (like flyers) have slack and can absorb small delays.',
            level: 'applied',
          },
          {
            id: 'pm-course-3-cp-2',
            courseSlug: 'pm-course-3',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Catch a budget overrun early and respond',
            onetSkills: ['Management of Material Resources', 'Mathematics'],
            scenario:
              'Your project budget is $10,000. You are halfway through the work but have already spent $7,000. The remaining work usually costs about the same as the first half.',
            question: 'What should you do first?',
            options: [
              { id: 'a', text: 'Wait — maybe the second half will cost less' },
              { id: 'b', text: 'Alert your sponsor now with the numbers and options, since you are trending over budget' },
              { id: 'c', text: 'Spend faster to finish before money runs out' },
              { id: 'd', text: 'Stop tracking costs to reduce stress' },
            ],
            correctOptionId: 'b',
            explanation:
              'Spending 70% of the budget at 50% of the work is an early warning. Good project managers raise cost problems early, with data and options — they never hide them or hope they fix themselves.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'pm-course-4',
        courseName: 'Managing Project Risks, Changes and Stakeholders',
        programSlug: 'project-management-professional-certificate-microsoft',
        checkpoints: [
          {
            id: 'pm-course-4-cp-1',
            courseSlug: 'pm-course-4',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Plan for risks before they happen',
            onetSkills: ['Social Perceptiveness'],
            scenario:
              'Your outdoor job fair is in six weeks. A teammate says, "What if it rains? Let’s not worry — it probably won’t."',
            question: 'What is the best response?',
            options: [
              { id: 'a', text: 'Agree — worrying about things that may not happen wastes time' },
              { id: 'b', text: 'Add rain to the risk register and line up a backup indoor space now' },
              { id: 'c', text: 'Cancel the event to remove all risk' },
              { id: 'd', text: 'Wait until the morning of the event to check the weather' },
            ],
            correctOptionId: 'b',
            explanation:
              'Risk management means identifying what could go wrong and planning a response in advance. A backup plan is cheap now and impossible to arrange the morning of the event.',
            level: 'foundation',
          },
          {
            id: 'pm-course-4-cp-2',
            courseSlug: 'pm-course-4',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Handle a stakeholder scope change calmly',
            onetSkills: ['Negotiation', 'Persuasion'],
            scenario:
              'Two weeks before launch, a key stakeholder demands a new feature. She is frustrated and says, "If it’s not in, I won’t support the launch."',
            question: 'What do you do?',
            options: [
              { id: 'a', text: 'Promise the feature to calm her down, then figure it out later' },
              { id: 'b', text: 'Tell her she is too late and end the conversation' },
              { id: 'c', text: 'Listen to why she needs it, then walk through the trade-offs and options together' },
              { id: 'd', text: 'Escalate straight to her boss without talking to her' },
            ],
            correctOptionId: 'c',
            explanation:
              'Understand the need first, then negotiate with facts: what the change costs in time and risk, and what options exist (launch then add it, swap scope, delay). Empty promises and shutdowns both damage trust.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'pm-course-5',
        courseName: 'Project Leadership, Communication and Stakeholder Management',
        programSlug: 'project-management-professional-certificate-microsoft',
        checkpoints: [
          {
            id: 'pm-course-5-cp-1',
            courseSlug: 'pm-course-5',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Send a clear, honest status update',
            onetSkills: ['Speaking'],
            scenario:
              'Your project is one week behind because a vendor shipped late. You are writing the weekly status email to leadership.',
            question: 'What should the email say?',
            options: [
              { id: 'a', text: '"Everything is on track" — you can probably catch up' },
              { id: 'b', text: 'The delay, its cause, the impact, and your recovery plan' },
              { id: 'c', text: 'A long blame-filled story about the vendor' },
              { id: 'd', text: 'Nothing — skip this week’s update' },
            ],
            correctOptionId: 'b',
            explanation:
              'Leaders need the truth plus a plan: what happened, what it means, and what you are doing about it. Hiding delays destroys credibility when they surface later — and they always do.',
            level: 'applied',
          },
          {
            id: 'pm-course-5-cp-2',
            courseSlug: 'pm-course-5',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Motivate a struggling team member instead of blaming them',
            onetSkills: ['Management of Personnel Resources', 'Social Perceptiveness'],
            scenario:
              'A usually reliable teammate has missed two deadlines this month. Other team members are starting to grumble about picking up the slack.',
            question: 'What should you do first?',
            options: [
              { id: 'a', text: 'Call out the missed deadlines in the next team meeting' },
              { id: 'b', text: 'Quietly reassign all their work without telling them' },
              { id: 'c', text: 'Have a private one-on-one to ask what is going on and how you can help' },
              { id: 'd', text: 'Report them to HR immediately' },
            ],
            correctOptionId: 'c',
            explanation:
              'A sudden change in a reliable person usually has a cause — workload, unclear requirements, or something personal. A private conversation finds the real problem; public call-outs and silent reassignment break trust.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'pm-course-6',
        courseName: 'Agile Project Management',
        programSlug: 'project-management-professional-certificate-microsoft',
        checkpoints: [
          {
            id: 'pm-course-6-cp-1',
            courseSlug: 'pm-course-6',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Run a useful daily standup',
            onetSkills: ['Coordination'],
            scenario:
              'Your Scrum team’s daily standup keeps running 45 minutes because two developers debate technical fixes in detail while everyone else waits.',
            question: 'How do you fix the standup?',
            options: [
              { id: 'a', text: 'Keep it to quick updates and blockers; move the technical debate to a follow-up with just those two' },
              { id: 'b', text: 'Cancel standups — they clearly do not work' },
              { id: 'c', text: 'Make standups 90 minutes so debates can finish' },
              { id: 'd', text: 'Tell the two developers to stop talking in meetings' },
            ],
            correctOptionId: 'a',
            explanation:
              'A standup is a short sync — progress, plans, blockers — usually 15 minutes. Deep problem-solving belongs in a smaller follow-up so the whole team’s time is respected.',
            level: 'applied',
          },
          {
            id: 'pm-course-6-cp-2',
            courseSlug: 'pm-course-6',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Handle mid-sprint change requests the agile way',
            onetSkills: ['Management of Personnel Resources'],
            scenario:
              'Three days into a two-week sprint, a manager asks your team to drop everything for a new "urgent" feature. The team already committed to the sprint goal.',
            question: 'What does good agile practice suggest?',
            options: [
              { id: 'a', text: 'Add the feature on top — agile means saying yes to everything' },
              { id: 'b', text: 'Put it in the backlog to prioritize next sprint, unless it is a true emergency worth re-planning the sprint' },
              { id: 'c', text: 'Refuse all changes until the project ends' },
              { id: 'd', text: 'Let each developer individually decide whether to switch' },
            ],
            correctOptionId: 'b',
            explanation:
              'Agile welcomes change between sprints, not constant mid-sprint churn. The product owner prioritizes it in the backlog; only a genuine emergency justifies disrupting the sprint goal.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'pm-course-7',
        courseName: 'Microsoft Project & Power BI for Project Managers',
        programSlug: 'project-management-professional-certificate-microsoft',
        checkpoints: [
          {
            id: 'pm-course-7-cp-1',
            courseSlug: 'pm-course-7',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Link tasks in Microsoft Project so the schedule updates itself',
            onetSkills: ['Technology Design'],
            scenario:
              'In Microsoft Project, "Paint walls" must finish before "Install shelves" can start. Right now the two tasks are not connected, so moving one does not move the other.',
            question: 'How should you set this up?',
            options: [
              { id: 'a', text: 'Manually retype the shelf dates every time painting slips' },
              { id: 'b', text: 'Link them with a finish-to-start dependency so shelves move automatically' },
              { id: 'c', text: 'Put both tasks on the same day to be safe' },
              { id: 'd', text: 'Delete the painting task to simplify the plan' },
            ],
            correctOptionId: 'b',
            explanation:
              'A finish-to-start dependency tells Project that one task cannot start until the other finishes. The schedule then updates itself when dates change — manual retyping invites errors.',
            level: 'applied',
          },
          {
            id: 'pm-course-7-cp-2',
            courseSlug: 'pm-course-7',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Build a dashboard leaders can actually read',
            onetSkills: ['Visualization', 'Operations Analysis'],
            scenario:
              'You are building a Power BI dashboard for executives who get five minutes to review your project each month. A colleague suggests showing all 200 task rows on one page.',
            question: 'What makes a better executive dashboard?',
            options: [
              { id: 'a', text: 'All 200 tasks — more data is always better' },
              { id: 'b', text: 'A few key visuals: overall status, budget vs. actual, top risks, and milestones' },
              { id: 'c', text: 'Only good news, so the meeting goes smoothly' },
              { id: 'd', text: 'Raw spreadsheet exports with no charts' },
            ],
            correctOptionId: 'b',
            explanation:
              'Dashboards summarize for fast decisions: status, money, risks, milestones. Detail lives in drill-downs. Showing everything — or only good news — defeats the purpose.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'pm-course-8',
        courseName: 'Project Management Capstone',
        programSlug: 'project-management-professional-certificate-microsoft',
        checkpoints: [
          {
            id: 'pm-course-8-cp-1',
            courseSlug: 'pm-course-8',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Pull a slipping project back on track',
            onetSkills: ['Complex Problem Solving'],
            scenario:
              'Your project is 3 weeks behind with a fixed launch date. The sponsor asks for a recovery plan by Friday. Budget can flex a little; the date cannot.',
            question: 'Which recovery option fits the constraints best?',
            options: [
              { id: 'a', text: 'Fast-track or add resources to critical-path tasks, and propose cutting low-priority scope' },
              { id: 'b', text: 'Ask everyone to work unpaid weekends indefinitely' },
              { id: 'c', text: 'Move the launch date anyway and inform the sponsor afterward' },
              { id: 'd', text: 'Do nothing and hope the team catches up' },
            ],
            correctOptionId: 'a',
            explanation:
              'When the date is fixed, you compress the critical path (crash with extra resources or fast-track by overlapping tasks) and negotiate scope. Burning out the team or ignoring the sponsor’s constraint are not plans.',
            level: 'job_ready',
          },
          {
            id: 'pm-course-8-cp-2',
            courseSlug: 'pm-course-8',
            programSlug: 'project-management-professional-certificate-microsoft',
            demonstratedSkill: 'Close a project so the next one goes better',
            onetSkills: ['Systems Evaluation'],
            scenario:
              'Your project just launched successfully. The team wants to jump straight to the next project. Your sponsor asks, "Are we officially done?"',
            question: 'What still needs to happen before the project is truly closed?',
            options: [
              { id: 'a', text: 'Nothing — launch means done' },
              { id: 'b', text: 'Confirm deliverables are accepted, hold a lessons-learned review, and archive project records' },
              { id: 'c', text: 'Delete all project files to free up space' },
              { id: 'd', text: 'Wait six months in case something breaks' },
            ],
            correctOptionId: 'b',
            explanation:
              'Formal closing means getting sign-off, capturing lessons learned, and archiving documents so future projects benefit. Skipping it loses hard-won knowledge.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // DIGITAL MARKETING & E-COMMERCE (Google)
  // ==========================================================================
  {
    programSlug: 'digital-marketing-e-commerce-google',
    programTitle: 'Digital Marketing & E-Commerce Professional Certificate',
    whyItMatters:
      'Employers want marketers who can attract customers and prove results with data — these checkpoints show you can do both.',
    courses: [
      {
        courseSlug: 'marketing-course-1',
        courseName: 'Foundations of Digital Marketing and E-commerce',
        programSlug: 'digital-marketing-e-commerce-google',
        checkpoints: [
          {
            id: 'marketing-course-1-cp-1',
            courseSlug: 'marketing-course-1',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Match marketing actions to the right funnel stage',
            onetSkills: ['Systems Analysis'],
            scenario:
              'A local bakery gets lots of website visitors, but very few sign up for the email list or place an order. The owner asks where the marketing funnel is leaking.',
            question: 'Which funnel stage needs the most attention?',
            options: [
              { id: 'a', text: 'Awareness — nobody knows the bakery exists' },
              { id: 'b', text: 'Consideration and conversion — visitors arrive but do not take the next step' },
              { id: 'c', text: 'Loyalty — repeat customers are the problem' },
              { id: 'd', text: 'No stage — funnels do not apply to small businesses' },
            ],
            correctOptionId: 'b',
            explanation:
              'High traffic with few sign-ups or orders means awareness is working but the middle and bottom of the funnel are leaking. Fix what convinces visitors to act, not what brings them in.',
            level: 'foundation',
          },
          {
            id: 'marketing-course-1-cp-2',
            courseSlug: 'marketing-course-1',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Pick the metric that matches the business goal',
            onetSkills: ['Judgment and Decision Making'],
            scenario:
              'Your boss wants more online sales this quarter. A coworker is excited because the brand’s Instagram followers doubled, but sales have not moved.',
            question: 'How should you read this?',
            options: [
              { id: 'a', text: 'Goal achieved — followers are what matter most' },
              { id: 'b', text: 'Followers are a nice signal, but conversions and revenue are the metrics tied to the goal' },
              { id: 'c', text: 'Sales numbers must be wrong if followers grew' },
              { id: 'd', text: 'Stop posting on Instagram entirely' },
            ],
            correctOptionId: 'b',
            explanation:
              'Followers are a vanity metric unless they drive the goal. When the goal is sales, measure conversions and revenue — then figure out how to turn the new audience into buyers.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'marketing-course-2',
        courseName: 'Attract and Engage Customers with Digital Marketing',
        programSlug: 'digital-marketing-e-commerce-google',
        checkpoints: [
          {
            id: 'marketing-course-2-cp-1',
            courseSlug: 'marketing-course-2',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Apply SEO basics that actually help a page rank',
            onetSkills: ['Written Expression'],
            scenario:
              'A plumber’s website does not show up when people search "emergency plumber near me." The site’s homepage title is just "Welcome!" and the pages barely mention plumbing services or the city.',
            question: 'What is the best first SEO fix?',
            options: [
              { id: 'a', text: 'Use clear titles and page text with the services and city people actually search for' },
              { id: 'b', text: 'Hide the words "emergency plumber" 100 times in white text' },
              { id: 'c', text: 'Buy followers on social media' },
              { id: 'd', text: 'Wait — search engines find every site eventually' },
            ],
            correctOptionId: 'a',
            explanation:
              'Search engines rank pages that clearly match what people search for. Descriptive titles and helpful text using real search terms is core SEO; hidden keyword stuffing gets sites penalized.',
            level: 'foundation',
          },
          {
            id: 'marketing-course-2-cp-2',
            courseSlug: 'marketing-course-2',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Plan content around what customers need, not just promotions',
            onetSkills: ['Originality', 'Fluency of Ideas'],
            scenario:
              'You manage content for a gardening store. Every post for a month has been "SALE! Buy now!" Engagement keeps dropping and people are unfollowing.',
            question: 'What change would help most?',
            options: [
              { id: 'a', text: 'Post the sales messages more often so people do not miss them' },
              { id: 'b', text: 'Mix in genuinely useful content — planting tips, how-tos, seasonal guides — with occasional promotions' },
              { id: 'c', text: 'Stop posting completely for a few months' },
              { id: 'd', text: 'Copy a competitor’s posts word for word' },
            ],
            correctOptionId: 'b',
            explanation:
              'People follow brands that help or entertain them. Useful content builds trust and keeps the audience around, which makes the occasional promotion far more effective. Pure ads drive people away.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'marketing-course-3',
        courseName: 'From Likes to Leads: Interact with Customers Online',
        programSlug: 'digital-marketing-e-commerce-google',
        checkpoints: [
          {
            id: 'marketing-course-3-cp-1',
            courseSlug: 'marketing-course-3',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Respond to a public customer complaint professionally',
            onetSkills: ['Service Orientation', 'Social Perceptiveness'],
            scenario:
              'A customer posts an angry public comment on your company’s Facebook page: "Ordered two weeks ago, still nothing, you people are scammers!"',
            question: 'What is the best response?',
            options: [
              { id: 'a', text: 'Delete the comment so others do not see it' },
              { id: 'b', text: 'Reply publicly with an apology and an offer to fix it, then move details to private messages' },
              { id: 'c', text: 'Argue back — the shipping delay was the carrier’s fault' },
              { id: 'd', text: 'Ignore it; angry customers calm down eventually' },
            ],
            correctOptionId: 'b',
            explanation:
              'A calm public reply shows everyone watching that you take care of customers; the private follow-up resolves the specific order. Deleting or arguing makes the brand look worse.',
            level: 'applied',
          },
          {
            id: 'marketing-course-3-cp-2',
            courseSlug: 'marketing-course-3',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Choose social platforms based on where the audience is',
            onetSkills: ['Speaking'],
            scenario:
              'A retirement community wants to reach adult children (ages 45-60) researching care for their parents. The intern suggests going all-in on TikTok dances because they are trending.',
            question: 'How do you decide where to post?',
            options: [
              { id: 'a', text: 'Follow the trend — TikTok is the biggest platform' },
              { id: 'b', text: 'Research where the 45-60 audience actually spends time and what content they trust, then choose platforms' },
              { id: 'c', text: 'Post identical content on every platform that exists' },
              { id: 'd', text: 'Skip social media because the audience is older' },
            ],
            correctOptionId: 'b',
            explanation:
              'Platform choice starts with the audience, not the trend. Research where your specific customers are and what format fits them — chasing trends wastes budget if your buyers are not there.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'marketing-course-4',
        courseName: 'Think Outside the Inbox: Email Marketing',
        programSlug: 'digital-marketing-e-commerce-google',
        checkpoints: [
          {
            id: 'marketing-course-4-cp-1',
            courseSlug: 'marketing-course-4',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Read email metrics and find the real problem',
            onetSkills: ['Critical Thinking', 'Mathematics'],
            scenario:
              'Your last email campaign had a 45% open rate (great) but only a 0.5% click rate (very low). Your manager asks what to fix for the next send.',
            question: 'What does this pattern tell you?',
            options: [
              { id: 'a', text: 'The subject line works, but the email content or call-to-action is not convincing people to click' },
              { id: 'b', text: 'The subject line is the problem' },
              { id: 'c', text: 'The email list is too small' },
              { id: 'd', text: 'Nothing — these numbers are unrelated' },
            ],
            correctOptionId: 'a',
            explanation:
              'Opens measure the subject line; clicks measure the content inside. High opens with low clicks means people liked the promise but the body or call-to-action did not deliver — fix the inside of the email.',
            level: 'applied',
          },
          {
            id: 'marketing-course-4-cp-2',
            courseSlug: 'marketing-course-4',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Run a fair A/B test on an email',
            onetSkills: ['Critical Thinking'],
            scenario:
              'You want to know whether a shorter subject line gets more opens. A coworker suggests changing the subject line, the send time, and the images all at once "to improve everything together."',
            question: 'Why is that a problem for the test?',
            options: [
              { id: 'a', text: 'It is not a problem — more changes mean more improvement' },
              { id: 'b', text: 'If results change, you will not know which change caused it — test one variable at a time' },
              { id: 'c', text: 'Emails can never be tested' },
              { id: 'd', text: 'Subject lines do not affect open rates' },
            ],
            correctOptionId: 'b',
            explanation:
              'An A/B test isolates one variable so you can attribute the result to it. Change several things at once and the data cannot tell you what worked.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'marketing-course-5',
        courseName: 'Assess for Success: Marketing Analytics and Measurement',
        programSlug: 'digital-marketing-e-commerce-google',
        checkpoints: [
          {
            id: 'marketing-course-5-cp-1',
            courseSlug: 'marketing-course-5',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Diagnose an underperforming ad campaign with data',
            onetSkills: ['Inductive Reasoning', 'Mathematics'],
            scenario:
              'Your search ad campaign gets plenty of clicks, but almost no one buys. Looking closer, the ad promises "free shipping" — but the landing page charges $9.99 shipping at checkout.',
            question: 'What is the most likely fix?',
            options: [
              { id: 'a', text: 'Raise the ad budget to get even more clicks' },
              { id: 'b', text: 'Make the landing page match the ad’s promise — the mismatch is killing conversions' },
              { id: 'c', text: 'Pause all advertising forever' },
              { id: 'd', text: 'Make the ad text smaller' },
            ],
            correctOptionId: 'b',
            explanation:
              'When clicks are healthy but conversions are not, look at what happens after the click. A broken promise between ad and landing page destroys trust at the exact moment of purchase.',
            level: 'applied',
          },
          {
            id: 'marketing-course-5-cp-2',
            courseSlug: 'marketing-course-5',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Calculate and compare return on ad spend',
            onetSkills: ['Mathematics', 'Systems Evaluation'],
            scenario:
              'You spent $500 on social ads and they produced $1,000 in sales. You spent $500 on search ads and they produced $2,500 in sales. The boss wants to move budget next month.',
            question: 'What does the data support?',
            options: [
              { id: 'a', text: 'Shift more budget toward search ads — they returned $5 per $1 spent versus $2 for social' },
              { id: 'b', text: 'Split budget exactly evenly to be fair to both channels' },
              { id: 'c', text: 'Cut both — ads that cost $500 are too expensive' },
              { id: 'd', text: 'Pick social because it is more fun' },
            ],
            correctOptionId: 'a',
            explanation:
              'Return on ad spend (revenue divided by cost) lets you compare channels: search returned 5x, social 2x. Budget should follow performance, while still testing and watching for changes.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'marketing-course-6',
        courseName: 'Make the Sale: Build, Launch, and Manage E-commerce Stores',
        programSlug: 'digital-marketing-e-commerce-google',
        checkpoints: [
          {
            id: 'marketing-course-6-cp-1',
            courseSlug: 'marketing-course-6',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Reduce checkout abandonment in an online store',
            onetSkills: ['Operations Analysis'],
            scenario:
              'Your Shopify store’s data shows 70% of shoppers add items to the cart but quit during checkout. Checkout currently requires creating an account and filling six pages of forms.',
            question: 'What is the best first improvement?',
            options: [
              { id: 'a', text: 'Simplify checkout — allow guest checkout and cut the steps down' },
              { id: 'b', text: 'Add more required fields to collect richer customer data' },
              { id: 'c', text: 'Raise prices to make up for lost sales' },
              { id: 'd', text: 'Remove the cart page entirely' },
            ],
            correctOptionId: 'a',
            explanation:
              'Long, forced-account checkouts are a top cause of cart abandonment. Guest checkout and fewer steps remove friction right where shoppers are quitting.',
            level: 'applied',
          },
          {
            id: 'marketing-course-6-cp-2',
            courseSlug: 'marketing-course-6',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Write product pages that help shoppers say yes',
            onetSkills: ['Technology Design'],
            scenario:
              'A handmade-candle store’s product pages each show one blurry photo and the text "Candle. $20." Sales are weak even though traffic is decent.',
            question: 'What should the product pages add first?',
            options: [
              { id: 'a', text: 'Clear photos, a description with scent and size details, and customer reviews' },
              { id: 'b', text: 'Flashing animations to grab attention' },
              { id: 'c', text: 'A pop-up on every page asking visitors to subscribe' },
              { id: 'd', text: 'Nothing — short pages always convert better' },
            ],
            correctOptionId: 'a',
            explanation:
              'Online shoppers cannot touch the product, so photos, specific details, and social proof do the selling. Blurry images and bare text leave too many unanswered questions to buy.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'marketing-course-7',
        courseName: 'Satisfaction Guaranteed: Develop Customer Loyalty Online',
        programSlug: 'digital-marketing-e-commerce-google',
        checkpoints: [
          {
            id: 'marketing-course-7-cp-1',
            courseSlug: 'marketing-course-7',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Know why keeping customers matters as much as finding them',
            onetSkills: ['Service Orientation'],
            scenario:
              'Your store spends its whole budget on ads for new customers. Data shows repeat customers spend three times more per order, but nobody ever contacts past buyers.',
            question: 'What opportunity is the store missing?',
            options: [
              { id: 'a', text: 'None — new customers are the only way to grow' },
              { id: 'b', text: 'Retention marketing — emailing past buyers and rewarding repeat purchases is cheaper than always buying new customers' },
              { id: 'c', text: 'Spending even more on new-customer ads' },
              { id: 'd', text: 'Deleting old customer records to save storage' },
            ],
            correctOptionId: 'b',
            explanation:
              'Keeping a customer usually costs far less than winning a new one, and repeat buyers spend more. A simple follow-up email or loyalty perk turns one-time buyers into regulars.',
            level: 'applied',
          },
          {
            id: 'marketing-course-7-cp-2',
            courseSlug: 'marketing-course-7',
            programSlug: 'digital-marketing-e-commerce-google',
            demonstratedSkill: 'Turn customer feedback into loyalty',
            onetSkills: ['Social Perceptiveness', 'Service Orientation'],
            scenario:
              'Post-purchase surveys keep saying the same thing: "Love the product, but shipping took too long." The team wants to ignore it because the product reviews are positive.',
            question: 'What is the best move?',
            options: [
              { id: 'a', text: 'Ignore it — positive reviews mean customers are happy enough' },
              { id: 'b', text: 'Act on the pattern: fix or set honest expectations about shipping, then tell customers you listened' },
              { id: 'c', text: 'Stop sending surveys so the complaints stop' },
              { id: 'd', text: 'Offer discounts only to people who complain loudly' },
            ],
            correctOptionId: 'b',
            explanation:
              'Repeated feedback is a roadmap to retention. Fixing the issue — and telling customers you did — builds the kind of trust that keeps them coming back. Silencing feedback just hides churn.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // UX DESIGN (Google)
  // ==========================================================================
  {
    programSlug: 'ux-design-professional-certificate-google',
    programTitle: 'UX Design Professional Certificate',
    whyItMatters:
      'Design teams hire people who can think like users and back decisions with research — these checkpoints prove you can.',
    courses: [
      {
        courseSlug: 'ux-design-course-1',
        courseName: 'Foundations of User Experience (UX) Design',
        programSlug: 'ux-design-professional-certificate-google',
        checkpoints: [
          {
            id: 'ux-design-course-1-cp-1',
            courseSlug: 'ux-design-course-1',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Put the user at the center of design decisions',
            onetSkills: ['Design'],
            scenario:
              'Your team is designing a bus-ticket app. The CEO wants the home screen to feature company news. User research shows riders open the app for one reason: to buy a ticket fast.',
            question: 'What does user-centered design suggest?',
            options: [
              { id: 'a', text: 'Feature the news — the CEO signs the paychecks' },
              { id: 'b', text: 'Make buying a ticket the fastest, most prominent action, and share the research with the CEO' },
              { id: 'c', text: 'Split the screen 50/50 so nobody is upset' },
              { id: 'd', text: 'Add a survey asking users what a home screen is' },
            ],
            correctOptionId: 'b',
            explanation:
              'User-centered design means the user’s main goal drives the layout — and research is your evidence when stakeholders disagree. A cluttered compromise serves no one.',
            level: 'foundation',
          },
          {
            id: 'ux-design-course-1-cp-2',
            courseSlug: 'ux-design-course-1',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Tell good usability from good looks',
            onetSkills: ['Systems Analysis', 'Originality'],
            scenario:
              'A restaurant’s new website wins praise for its beautiful animations. But customers keep calling because they cannot find the menu — it is hidden behind an unlabeled icon.',
            question: 'How would a UX designer judge this site?',
            options: [
              { id: 'a', text: 'It succeeds — beauty is what design is about' },
              { id: 'b', text: 'It fails a core usability test: users cannot complete their main task of finding the menu' },
              { id: 'c', text: 'It is fine — customers should learn the icons' },
              { id: 'd', text: 'The problem is the customers, not the site' },
            ],
            correctOptionId: 'b',
            explanation:
              'Good UX means people can actually do what they came to do. A beautiful site that hides the menu fails its users — usability comes before decoration.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'ux-design-course-2',
        courseName: 'Start the UX Design Process: Empathize, Define, and Ideate',
        programSlug: 'ux-design-professional-certificate-google',
        checkpoints: [
          {
            id: 'ux-design-course-2-cp-1',
            courseSlug: 'ux-design-course-2',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Ask interview questions that uncover real user needs',
            onetSkills: ['Social Perceptiveness'],
            scenario:
              'You are interviewing users about how they manage medication reminders. Your first draft question is: "Don’t you think our new reminder app idea is great?"',
            question: 'What is wrong with this question?',
            options: [
              { id: 'a', text: 'Nothing — enthusiasm helps interviews' },
              { id: 'b', text: 'It is leading; ask open questions like "Walk me through how you remember your medications now"' },
              { id: 'c', text: 'It is too short — questions should have several parts' },
              { id: 'd', text: 'It should be a yes/no question to save time' },
            ],
            correctOptionId: 'b',
            explanation:
              'Leading questions push people to agree with you instead of revealing how they really behave. Open, neutral questions about current habits surface the real problems worth solving.',
            level: 'foundation',
          },
          {
            id: 'ux-design-course-2-cp-2',
            courseSlug: 'ux-design-course-2',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Build personas from research, not stereotypes',
            onetSkills: ['Fluency of Ideas', 'Visualization'],
            scenario:
              'Your team is creating personas for a banking app. A teammate invents "Tech-Confused Tina, 70," without any research, saying "older people obviously can’t use apps."',
            question: 'What is the problem with this persona?',
            options: [
              { id: 'a', text: 'The name is not catchy enough' },
              { id: 'b', text: 'It is based on a stereotype instead of real interview and research data' },
              { id: 'c', text: 'Personas should never include an age' },
              { id: 'd', text: 'There is no problem — assumptions speed things up' },
            ],
            correctOptionId: 'b',
            explanation:
              'Personas are only useful when they summarize patterns found in real research. Stereotype-based personas bake bias into the product and lead to designs that fail real users.',
            level: 'applied',
          },
          {
            id: 'ux-design-course-2-cp-3',
            courseSlug: 'ux-design-course-2',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Write a clear problem statement before designing',
            onetSkills: ['Originality'],
            scenario:
              'After research on a grocery app, your team jumps straight to debating button colors. Nobody has yet written down what user problem you are solving.',
            question: 'What should the team do first?',
            options: [
              { id: 'a', text: 'Keep debating colors — details matter most' },
              { id: 'b', text: 'Write a problem statement: who the user is, what they need, and why' },
              { id: 'c', text: 'Copy a competitor’s app exactly' },
              { id: 'd', text: 'Start coding immediately' },
            ],
            correctOptionId: 'b',
            explanation:
              'A problem statement (user + need + insight) keeps every later decision anchored to a real need. Without it, teams polish details for a problem nobody defined.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'ux-design-course-3',
        courseName: 'Build Wireframes and Low-Fidelity Prototypes',
        programSlug: 'ux-design-professional-certificate-google',
        checkpoints: [
          {
            id: 'ux-design-course-3-cp-1',
            courseSlug: 'ux-design-course-3',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Know why wireframes stay rough on purpose',
            onetSkills: ['Visualization'],
            scenario:
              'You sketch quick gray-box wireframes for a job-search app. A stakeholder complains: "Where are the colors and photos? This looks unfinished."',
            question: 'How do you explain the wireframes?',
            options: [
              { id: 'a', text: 'Apologize and add full colors and photos before any layout feedback' },
              { id: 'b', text: 'Explain that wireframes stay simple on purpose so we can test layout and flow cheaply before investing in visuals' },
              { id: 'c', text: 'Agree the work is unfinished and start over' },
              { id: 'd', text: 'Tell the stakeholder wireframes are the final product' },
            ],
            correctOptionId: 'b',
            explanation:
              'Low fidelity is a feature: it keeps feedback focused on structure and is cheap to change. Polishing visuals too early wastes effort on layouts that may not survive testing.',
            level: 'foundation',
          },
          {
            id: 'ux-design-course-3-cp-2',
            courseSlug: 'ux-design-course-3',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Organize an app so users can find things',
            onetSkills: ['Flexibility of Closure', 'Technology Design'],
            scenario:
              'In your library app wireframe, "Renew a book" is buried four taps deep under Settings > Account > History > Actions. User notes say renewing is the #1 reason people open the app.',
            question: 'What does good information architecture suggest?',
            options: [
              { id: 'a', text: 'Leave it — users will memorize the path eventually' },
              { id: 'b', text: 'Move renewing to the home screen since it is the most common task' },
              { id: 'c', text: 'Add a sixth menu level for completeness' },
              { id: 'd', text: 'Remove the renew feature to simplify the app' },
            ],
            correctOptionId: 'b',
            explanation:
              'Information architecture puts the most frequent and important tasks within easy reach. Burying the top task under four taps guarantees frustration.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'ux-design-course-4',
        courseName: 'Conduct UX Research and Test Early Concepts',
        programSlug: 'ux-design-professional-certificate-google',
        checkpoints: [
          {
            id: 'ux-design-course-4-cp-1',
            courseSlug: 'ux-design-course-4',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Run a usability test without biasing participants',
            onetSkills: ['Active Listening', 'Science'],
            scenario:
              'During a usability test, a participant stares at your checkout screen, confused. You feel the urge to say, "The pay button is right there at the bottom!"',
            question: 'What should you do instead?',
            options: [
              { id: 'a', text: 'Point at the button — the test goes faster' },
              { id: 'b', text: 'Stay quiet or ask "What are you trying to do?" and let them work through it' },
              { id: 'c', text: 'End the session — this participant is not smart enough' },
              { id: 'd', text: 'Mark the task successful since the button does exist' },
            ],
            correctOptionId: 'b',
            explanation:
              'The confusion IS the finding — it shows the design needs work. Helping participants hides the exact problems the test exists to reveal.',
            level: 'applied',
          },
          {
            id: 'ux-design-course-4-cp-2',
            courseSlug: 'ux-design-course-4',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Turn usability findings into design priorities',
            onetSkills: ['Inductive Reasoning', 'Deductive Reasoning'],
            scenario:
              'Your usability test results: 5 of 6 participants could not find the search bar, and 1 participant disliked the shade of blue. Your team has time to fix one thing this sprint.',
            question: 'Which finding do you prioritize?',
            options: [
              { id: 'a', text: 'The blue color — opinions about looks matter most' },
              { id: 'b', text: 'The search bar — most users failed a core task, so it blocks the experience' },
              { id: 'c', text: 'Neither — six participants is too few to learn anything' },
              { id: 'd', text: 'Both equally, by splitting the sprint in half' },
            ],
            correctOptionId: 'b',
            explanation:
              'Prioritize by severity and frequency: a task failure hitting most users outranks one person’s color preference. Small usability studies reliably surface this kind of major issue.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'ux-design-course-5',
        courseName: 'Create High-Fidelity Designs and Prototypes in Figma',
        programSlug: 'ux-design-professional-certificate-google',
        checkpoints: [
          {
            id: 'ux-design-course-5-cp-1',
            courseSlug: 'ux-design-course-5',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Use visual hierarchy to guide the user’s eye',
            onetSkills: ['Fine Arts', 'Visualization'],
            scenario:
              'On your high-fidelity sign-up screen, the "Create account" button, the "Cancel" link, and a legal disclaimer all use the same size, color, and weight. Testers hesitate, unsure where to go.',
            question: 'What is the visual hierarchy fix?',
            options: [
              { id: 'a', text: 'Make everything bigger so nothing is missed' },
              { id: 'b', text: 'Make the primary action stand out — bold, high-contrast button — and visually quiet the secondary items' },
              { id: 'c', text: 'Use a different bright color for every element' },
              { id: 'd', text: 'Remove the cancel option so there is only one choice' },
            ],
            correctOptionId: 'b',
            explanation:
              'Hierarchy means the most important action looks the most important. When everything shouts equally, nothing stands out and users hesitate.',
            level: 'applied',
          },
          {
            id: 'ux-design-course-5-cp-2',
            courseSlug: 'ux-design-course-5',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Use Figma components to keep designs consistent',
            onetSkills: ['Perceptual Speed'],
            scenario:
              'Your Figma file has 40 screens. The client asks you to change the button style. You realize you drew each button separately, so you would have to edit all 40 by hand.',
            question: 'What Figma practice prevents this next time?',
            options: [
              { id: 'a', text: 'Create a button component once and reuse instances, so one edit updates every screen' },
              { id: 'b', text: 'Keep fewer screens so editing is faster' },
              { id: 'c', text: 'Take screenshots of buttons and paste them in' },
              { id: 'd', text: 'Refuse style changes after the first draft' },
            ],
            correctOptionId: 'a',
            explanation:
              'Components are reusable master elements: change the main component and every instance updates. They keep large files consistent and make revisions fast.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'ux-design-course-6',
        courseName: 'Responsive Web Design in Adobe XD',
        programSlug: 'ux-design-professional-certificate-google',
        checkpoints: [
          {
            id: 'ux-design-course-6-cp-1',
            courseSlug: 'ux-design-course-6',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Design responsively for phones first',
            onetSkills: ['Technology Design', 'Visualization'],
            scenario:
              'Analytics show 80% of your nonprofit’s site visitors use phones. Your desktop mockup has three side-by-side columns and tiny links that are hard to tap.',
            question: 'How should the mobile version handle this layout?',
            options: [
              { id: 'a', text: 'Shrink the whole desktop page so it fits a phone screen' },
              { id: 'b', text: 'Stack the columns into one, enlarge tap targets, and prioritize the most important content first' },
              { id: 'c', text: 'Show a message telling visitors to use a computer' },
              { id: 'd', text: 'Hide most content on mobile to avoid scrolling' },
            ],
            correctOptionId: 'b',
            explanation:
              'Responsive design reflows content for the screen: single columns, comfortable tap sizes, key content first. Shrinking a desktop page makes everything unreadable and untappable.',
            level: 'applied',
          },
          {
            id: 'ux-design-course-6-cp-2',
            courseSlug: 'ux-design-course-6',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Hand off designs developers can actually build',
            onetSkills: ['Technology Design', 'Flexibility of Closure'],
            scenario:
              'You send a developer one flat image of your design. He writes back: "What are the exact spacing values, font sizes, and what happens when text is longer than this example?"',
            question: 'What does a good design handoff include?',
            options: [
              { id: 'a', text: 'Just the image — developers should figure out the rest' },
              { id: 'b', text: 'Specs for spacing, type, and colors, plus notes on how layouts adapt to different content and screens' },
              { id: 'c', text: 'A verbal description over the phone with nothing written' },
              { id: 'd', text: 'The raw design file with no explanation' },
            ],
            correctOptionId: 'b',
            explanation:
              'Developers build from rules, not pictures. Handoff means specs, states, and behavior notes — including what happens when real content does not match the mockup.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'ux-design-course-7',
        courseName: 'Design a User Experience for Social Good & Prepare for Jobs',
        programSlug: 'ux-design-professional-certificate-google',
        checkpoints: [
          {
            id: 'ux-design-course-7-cp-1',
            courseSlug: 'ux-design-course-7',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Tell the story of your design work in a case study',
            onetSkills: ['Speaking'],
            scenario:
              'You are building your UX portfolio. Your first draft case study is 12 final screenshots with no words. A mentor says hiring managers will skip right past it.',
            question: 'What makes a case study stronger?',
            options: [
              { id: 'a', text: 'Even more screenshots, larger' },
              { id: 'b', text: 'The story: the problem, your research, key decisions, what you tested, and what you learned' },
              { id: 'c', text: 'Removing all images and writing an essay' },
              { id: 'd', text: 'Listing every software tool you have ever opened' },
            ],
            correctOptionId: 'b',
            explanation:
              'Hiring managers want your thinking, not just the output: how you found the problem, what you tried, and why. Screens without process show taste but prove nothing about your judgment.',
            level: 'job_ready',
          },
          {
            id: 'ux-design-course-7-cp-2',
            courseSlug: 'ux-design-course-7',
            programSlug: 'ux-design-professional-certificate-google',
            demonstratedSkill: 'Design inclusively for people unlike yourself',
            onetSkills: ['Social Perceptiveness', 'Service Orientation'],
            scenario:
              'You are designing a food-bank locator for a community where many residents have limited data plans, older phones, and varied reading levels. A teammate proposes a heavy, animation-rich app.',
            question: 'What approach serves these users best?',
            options: [
              { id: 'a', text: 'The animation-rich app — it will impress everyone' },
              { id: 'b', text: 'A lightweight, fast-loading design with plain language and simple navigation' },
              { id: 'c', text: 'Desktop-only, since design is easier there' },
              { id: 'd', text: 'Require the newest phones to keep quality high' },
            ],
            correctOptionId: 'b',
            explanation:
              'Equity-focused design starts from real constraints: data costs, older devices, reading level. A fast, plain-language experience reaches the people who need the service most.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // DIGITAL LITERACY EMPOWERMENT CLASS
  // ==========================================================================
  {
    programSlug: 'digital-literacy-empowerment-class',
    programTitle: 'Workforce AP Digital Literacy Course',
    whyItMatters:
      'These everyday computer skills — email, search, and staying safe online — open the door to jobs, services, and every other program here.',
    courses: [
      {
        courseSlug: 'digital-literacy-course-2',
        courseName: 'Internet Basics',
        programSlug: 'digital-literacy-empowerment-class',
        checkpoints: [
          {
            id: 'digital-literacy-course-2-cp-1',
            courseSlug: 'digital-literacy-course-2',
            programSlug: 'digital-literacy-empowerment-class',
            demonstratedSkill: 'Use a web browser to get to a website',
            onetSkills: ['Technology Design'],
            scenario:
              'You want to visit your bank’s website. You open Chrome and see a bar at the top of the screen where you can type.',
            question: 'What is the best way to get to the bank’s site?',
            options: [
              { id: 'a', text: 'Type the bank’s name or web address in the bar at the top and press Enter' },
              { id: 'b', text: 'Turn the computer off and on until the site appears' },
              { id: 'c', text: 'Wait for the bank to call you' },
              { id: 'd', text: 'Click every icon on the desktop until something opens' },
            ],
            correctOptionId: 'a',
            explanation:
              'The address bar at the top of the browser takes you anywhere on the web. Type the site’s name or address, press Enter, and the browser finds it.',
            level: 'foundation',
          },
          {
            id: 'digital-literacy-course-2-cp-2',
            courseSlug: 'digital-literacy-course-2',
            programSlug: 'digital-literacy-empowerment-class',
            demonstratedSkill: 'Search the internet with useful keywords',
            onetSkills: ['Technology Design'],
            scenario:
              'You need the hours of the public library on Main Street. You open Google and wonder what to type to find the answer quickly.',
            question: 'Which search will work best?',
            options: [
              { id: 'a', text: '"library"' },
              { id: 'b', text: '"Main Street public library hours"' },
              { id: 'c', text: '"please tell me when buildings open thank you"' },
              { id: 'd', text: '"books"' },
            ],
            correctOptionId: 'b',
            explanation:
              'Specific keywords — the place plus what you want to know — get you the right answer fast. One-word searches are too broad, and polite full sentences add words the search does not need.',
            level: 'foundation',
          },
          {
            id: 'digital-literacy-course-2-cp-3',
            courseSlug: 'digital-literacy-course-2',
            programSlug: 'digital-literacy-empowerment-class',
            demonstratedSkill: 'Try a simple fix before giving up on a device',
            onetSkills: ['Troubleshooting'],
            scenario:
              'Your laptop’s internet stops working in the middle of looking up a recipe. Other phones in the house still have Wi-Fi, so the internet itself is fine.',
            question: 'What is a good first step to try?',
            options: [
              { id: 'a', text: 'Restart the laptop and check that its Wi-Fi is turned on' },
              { id: 'b', text: 'Buy a new laptop' },
              { id: 'c', text: 'Never use that laptop again' },
              { id: 'd', text: 'Unplug everything in the house' },
            ],
            correctOptionId: 'a',
            explanation:
              'A restart and a quick Wi-Fi check fix many everyday computer problems. Start with the simplest, free step before anything drastic.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'digital-literacy-course-3',
        courseName: 'Email Basics',
        programSlug: 'digital-literacy-empowerment-class',
        checkpoints: [
          {
            id: 'digital-literacy-course-3-cp-1',
            courseSlug: 'digital-literacy-course-3',
            programSlug: 'digital-literacy-empowerment-class',
            demonstratedSkill: 'Send an email with a clear subject line',
            onetSkills: ['Written Expression'],
            scenario:
              'You are emailing a job counselor to ask about Thursday’s resume workshop. You have written the message but the subject line is still empty.',
            question: 'What should you put in the subject line?',
            options: [
              { id: 'a', text: 'Leave it blank — the message explains everything' },
              { id: 'b', text: 'Something short and clear, like "Question about Thursday’s resume workshop"' },
              { id: 'c', text: '"HELLO!!!"' },
              { id: 'd', text: 'Your entire message, copied into the subject' },
            ],
            correctOptionId: 'b',
            explanation:
              'A short, specific subject tells the reader what the email is about before they open it. Blank or shouting subjects can be ignored or even land in spam.',
            level: 'foundation',
          },
          {
            id: 'digital-literacy-course-3-cp-2',
            courseSlug: 'digital-literacy-course-3',
            programSlug: 'digital-literacy-empowerment-class',
            demonstratedSkill: 'Write a polite, professional email',
            onetSkills: ['Written Expression', 'Written Comprehension'],
            scenario:
              'You are emailing a potential employer about a cashier job opening. You want to make a good first impression.',
            question: 'Which opening works best?',
            options: [
              { id: 'a', text: '"hey whats up, u hiring?"' },
              { id: 'b', text: '"Hello Ms. Garcia, my name is Sam Lee. I am writing to ask about the cashier position."' },
              { id: 'c', text: '"TO WHOEVER READS THIS, I NEED A JOB NOW"' },
              { id: 'd', text: 'No greeting — just attach your resume with nothing written' },
            ],
            correctOptionId: 'b',
            explanation:
              'A polite greeting, your name, and your reason for writing show respect and make you easy to help. Slang, all caps, or an empty email leave a poor first impression.',
            level: 'applied',
          },
          {
            id: 'digital-literacy-course-3-cp-3',
            courseSlug: 'digital-literacy-course-3',
            programSlug: 'digital-literacy-empowerment-class',
            demonstratedSkill: 'Use Reply and Reply All correctly',
            onetSkills: ['Written Comprehension'],
            scenario:
              'Your class instructor emails the whole class about a schedule change. You want to ask her a private question about your own attendance.',
            question: 'Which button should you use?',
            options: [
              { id: 'a', text: 'Reply — so only the instructor sees your question' },
              { id: 'b', text: 'Reply All — so the whole class sees your private question' },
              { id: 'c', text: 'Forward it to people outside the class' },
              { id: 'd', text: 'Start a brand-new email to everyone you know' },
            ],
            correctOptionId: 'a',
            explanation:
              '"Reply" goes only to the sender; "Reply All" goes to everyone on the email. Private questions belong in a Reply — Reply All shares them with the whole group.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'digital-literacy-course-4',
        courseName: 'Cybersecurity Basics: Online Scams and Fraud',
        programSlug: 'digital-literacy-empowerment-class',
        checkpoints: [
          {
            id: 'digital-literacy-course-4-cp-1',
            courseSlug: 'digital-literacy-course-4',
            programSlug: 'digital-literacy-empowerment-class',
            demonstratedSkill: 'Spot a phishing email before it tricks you',
            onetSkills: ['Critical Thinking'],
            scenario:
              'An email says it is from your bank: "URGENT! Your account is locked. Click here NOW and enter your password to unlock it." The sender’s address is "bank-help@secure-fix123.com".',
            question: 'What should you do?',
            options: [
              { id: 'a', text: 'Click the link fast, before the account closes' },
              { id: 'b', text: 'Reply with your password so they can fix it' },
              { id: 'c', text: 'Do not click; contact your bank yourself using the phone number or website you already know' },
              { id: 'd', text: 'Forward it to friends in case their accounts are locked too' },
            ],
            correctOptionId: 'c',
            explanation:
              'Urgent pressure, a strange sender address, and a request for your password are classic phishing signs. Real banks never ask for passwords by email — always go to the bank directly yourself.',
            level: 'foundation',
          },
          {
            id: 'digital-literacy-course-4-cp-2',
            courseSlug: 'digital-literacy-course-4',
            programSlug: 'digital-literacy-empowerment-class',
            demonstratedSkill: 'Recognize a too-good-to-be-true online offer',
            onetSkills: ['Judgment and Decision Making'],
            scenario:
              'A pop-up says: "Congratulations! You won a $1,000 gift card! Just pay $20 shipping and enter your card number to claim it." You never entered any contest.',
            question: 'What is the safest move?',
            options: [
              { id: 'a', text: 'Pay the $20 — a $1,000 prize is worth it' },
              { id: 'b', text: 'Close the pop-up and do not enter any information — you cannot win a contest you never entered' },
              { id: 'c', text: 'Enter your card number but not the security code' },
              { id: 'd', text: 'Share the link so friends can win too' },
            ],
            correctOptionId: 'b',
            explanation:
              'Real prizes never require your card number or an upfront fee. "You won!" messages for contests you never entered are scams designed to steal money and card details.',
            level: 'applied',
          },
          {
            id: 'digital-literacy-course-4-cp-3',
            courseSlug: 'digital-literacy-course-4',
            programSlug: 'digital-literacy-empowerment-class',
            demonstratedSkill: 'Build a simple budget that covers needs first',
            onetSkills: ['Judgment and Decision Making', 'Critical Thinking'],
            scenario:
              'You bring home $1,400 a month. Rent is $800, groceries about $250, and the bus pass is $60. A streaming bundle ad offers "only $65 a month."',
            question: 'What does a simple budget tell you to do first?',
            options: [
              { id: 'a', text: 'Cover needs first — rent, food, transportation — then see what is left for extras and savings' },
              { id: 'b', text: 'Sign up for the bundle first since it is advertised today only' },
              { id: 'c', text: 'Skip making a budget — it is too stressful to look at' },
              { id: 'd', text: 'Pay for extras first because they are smaller amounts' },
            ],
            correctOptionId: 'a',
            explanation:
              'Budgeting means needs before wants: housing, food, and getting to work come first. What remains can go to savings and extras — and "today only" pressure is a sales trick, not a reason.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },
];
