/**
 * Skill checkpoints for the data and software programs:
 * - Data Analytics Professional Certificate (Google)
 * - Data Science Professional Certificate (IBM)
 * - AI Professional Practitioner Certificate (IBM)
 * - Software Developer Professional Certificate (IBM)
 * - Cybersecurity Professional Certificate (Google)
 *
 * Content follows the rules in ./types.ts: workplace scenarios, 8th-grade
 * reading level, plausible-mistake distractors, teaching explanations.
 */

import type { ProgramCheckpointPack } from './types';

export const DATA_AND_SOFTWARE_PACKS: ProgramCheckpointPack[] = [
  // ==========================================================================
  // DATA ANALYTICS (Google)
  // ==========================================================================
  {
    programSlug: 'data-analytics-professional-certificate-google',
    programTitle: 'Data Analytics Professional Certificate',
    whyItMatters:
      'These checkpoints prove to employers that you can clean, analyze, and explain real data — not just talk about it.',
    courses: [
      {
        courseSlug: 'data-analytics-course-1',
        courseName: 'Foundations: Data, Data, Everywhere',
        programSlug: 'data-analytics-professional-certificate-google',
        checkpoints: [
          {
            id: 'data-analytics-course-1-cp-1',
            courseSlug: 'data-analytics-course-1',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Tell the difference between data types in a spreadsheet',
            onetSkills: ['Reading Comprehension', 'Critical Thinking'],
            scenario:
              'Your manager shares a spreadsheet of customer orders. One column shows order dates, another shows "Yes/No" for repeat customers, and a third shows order totals in dollars.',
            question: 'Which column holds quantitative data you can do math on?',
            options: [
              { id: 'a', text: 'The "Yes/No" repeat customer column' },
              { id: 'b', text: 'The order totals column' },
              { id: 'c', text: 'The customer name column' },
              { id: 'd', text: 'None of them — spreadsheets only hold text' },
            ],
            correctOptionId: 'b',
            explanation:
              'Order totals are numbers you can add or average, which makes them quantitative. "Yes/No" and names are qualitative — they describe categories, not amounts.',
            level: 'foundation',
          },
          {
            id: 'data-analytics-course-1-cp-2',
            courseSlug: 'data-analytics-course-1',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Follow the steps of the data analysis process',
            onetSkills: ['Active Learning', 'Critical Thinking'],
            scenario:
              'A store owner asks you, "Why did sales drop last month?" You have access to the sales data but have not opened it yet.',
            question: 'What should you do first?',
            options: [
              { id: 'a', text: 'Build a chart of last month\'s sales right away' },
              { id: 'b', text: 'Ask questions to understand the problem, like which products or weeks dropped' },
              { id: 'c', text: 'Delete any rows that look unusual' },
              { id: 'd', text: 'Email the team that sales will recover soon' },
            ],
            correctOptionId: 'b',
            explanation:
              'The analysis process starts with the Ask phase — defining the problem before touching the data. Charting or cleaning first wastes time if you do not know what question you are answering.',
            level: 'foundation',
          },
        ],
      },
      {
        courseSlug: 'data-analytics-course-2',
        courseName: 'Ask Questions to Make Data-Driven Decisions',
        programSlug: 'data-analytics-professional-certificate-google',
        checkpoints: [
          {
            id: 'data-analytics-course-2-cp-1',
            courseSlug: 'data-analytics-course-2',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Turn a vague request into a clear, measurable question',
            onetSkills: ['Complex Problem Solving', 'Judgment and Decision Making'],
            scenario:
              'A marketing lead says, "Figure out if our ads are working." That is too vague to analyze directly.',
            question: 'Which version is a SMART, measurable question?',
            options: [
              { id: 'a', text: 'Are the ads good?' },
              { id: 'b', text: 'Do people like our brand more now?' },
              { id: 'c', text: 'Did website sales from ad clicks increase in the 30 days after the campaign started?' },
              { id: 'd', text: 'Should we spend more money on ads someday?' },
            ],
            correctOptionId: 'c',
            explanation:
              'A good data question is specific, measurable, and time-bound. Option C names the metric (sales from ad clicks) and the time window, so you can actually answer it with data.',
            level: 'foundation',
          },
          {
            id: 'data-analytics-course-2-cp-2',
            courseSlug: 'data-analytics-course-2',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Manage stakeholder expectations on a data project',
            onetSkills: ['Judgment and Decision Making', 'Systems Analysis'],
            scenario:
              'A director asks for a full sales analysis "by tomorrow." You know the data needs at least three days of cleaning before any analysis is trustworthy.',
            question: 'What is the best response?',
            options: [
              { id: 'a', text: 'Skip the cleaning and deliver whatever you can by tomorrow' },
              { id: 'b', text: 'Say nothing and deliver it late' },
              { id: 'c', text: 'Explain the timeline, the risk of skipping cleaning, and offer a smaller answer for tomorrow' },
              { id: 'd', text: 'Decline the project because the deadline is unfair' },
            ],
            correctOptionId: 'c',
            explanation:
              'Analysts communicate trade-offs early. Offering a scoped-down deliverable keeps trust while protecting data quality. Rushing dirty data leads to wrong decisions.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'data-analytics-course-3',
        courseName: 'Prepare Data for Exploration',
        programSlug: 'data-analytics-professional-certificate-google',
        checkpoints: [
          {
            id: 'data-analytics-course-3-cp-1',
            courseSlug: 'data-analytics-course-3',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Judge whether a data source is trustworthy',
            onetSkills: ['Quality Control Analysis'],
            scenario:
              'You need customer age data for a report. One option is your company\'s signup database. Another is a free file someone posted on a forum five years ago with no source listed.',
            question: 'Why is the signup database the better choice?',
            options: [
              { id: 'a', text: 'It has more rows, and more rows always means better data' },
              { id: 'b', text: 'It is original, current, and you know where it came from' },
              { id: 'c', text: 'It is free to use' },
              { id: 'd', text: 'Forum data is always illegal to use' },
            ],
            correctOptionId: 'b',
            explanation:
              'Good data is original, current, and cited — you can trace it to its source. Size alone does not make data reliable, and the forum file fails on age and credibility, not legality.',
            level: 'foundation',
          },
          {
            id: 'data-analytics-course-3-cp-2',
            courseSlug: 'data-analytics-course-3',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Write a basic SQL query to pull the rows you need',
            onetSkills: ['Programming'],
            scenario:
              'You need a list of customers in Texas from a table called `customers`, which has columns `name`, `state`, and `email`.',
            question: 'Which query returns only Texas customers?',
            options: [
              { id: 'a', text: "SELECT * FROM customers WHERE state = 'TX';" },
              { id: 'b', text: 'SELECT * FROM customers;' },
              { id: 'c', text: "SELECT state FROM customers WHERE name = 'TX';" },
              { id: 'd', text: "DELETE FROM customers WHERE state = 'TX';" },
            ],
            correctOptionId: 'a',
            explanation:
              'The WHERE clause filters rows, so filtering on state = \'TX\' returns only Texas customers. Option B returns everyone, C filters the wrong column, and D deletes data instead of reading it.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'data-analytics-course-4',
        courseName: 'Process Data from Dirty to Clean',
        programSlug: 'data-analytics-professional-certificate-google',
        checkpoints: [
          {
            id: 'data-analytics-course-4-cp-1',
            courseSlug: 'data-analytics-course-4',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Spot and fix duplicate records before analysis',
            onetSkills: ['Quality Control Analysis'],
            scenario:
              'Your customer spreadsheet shows 5,200 rows, but the membership team says there are only about 5,000 members. You suspect duplicates are inflating your counts.',
            question: 'What is the right first step?',
            options: [
              { id: 'a', text: 'Use a remove-duplicates tool or COUNTIF to find repeated records, then review before deleting' },
              { id: 'b', text: 'Delete the last 200 rows so the total matches' },
              { id: 'c', text: 'Report 5,200 members since that is what the file says' },
              { id: 'd', text: 'Sort by name and delete anyone with a common last name' },
            ],
            correctOptionId: 'a',
            explanation:
              'Find duplicates systematically and review them before removing — some "duplicates" may be different people with similar info. Deleting arbitrary rows to force a match destroys good data.',
            level: 'applied',
          },
          {
            id: 'data-analytics-course-4-cp-2',
            courseSlug: 'data-analytics-course-4',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Debug a SQL query that returns the wrong rows',
            onetSkills: ['Programming', 'Systems Analysis'],
            scenario:
              "You run: SELECT * FROM orders WHERE status = 'shipped' OR status = 'delivered' AND total > 100. You expect only orders over $100, but cheap shipped orders keep appearing in the results.",
            question: 'Why is the query returning the wrong rows?',
            options: [
              { id: 'a', text: 'SQL cannot combine OR and AND in one query' },
              { id: 'b', text: 'AND runs before OR, so the $100 filter only applies to delivered orders — add parentheses around the OR' },
              { id: 'c', text: 'The total column must be text, not a number' },
              { id: 'd', text: 'You need SELECT total instead of SELECT *' },
            ],
            correctOptionId: 'b',
            explanation:
              'SQL evaluates AND before OR. Wrapping the two status checks in parentheses makes the total > 100 filter apply to both. This operator-order bug is one of the most common SQL mistakes.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'data-analytics-course-5',
        courseName: 'Analyze Data to Answer Questions',
        programSlug: 'data-analytics-professional-certificate-google',
        checkpoints: [
          {
            id: 'data-analytics-course-5-cp-1',
            courseSlug: 'data-analytics-course-5',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Summarize sales by group using a pivot table',
            onetSkills: ['Mathematics', 'Critical Thinking'],
            scenario:
              'Your manager asks, "Which product category made the most money last quarter?" You have a spreadsheet with one row per sale, including columns for category and sale amount.',
            question: 'What is the fastest reliable way to answer?',
            options: [
              { id: 'a', text: 'Scroll through the rows and keep a running total in your head' },
              { id: 'b', text: 'Build a pivot table with category as rows and sum of sale amount as values' },
              { id: 'c', text: 'Count how many rows each category has — most rows wins' },
              { id: 'd', text: 'Average the sale amounts for the whole sheet' },
            ],
            correctOptionId: 'b',
            explanation:
              'A pivot table groups and sums in seconds. Counting rows measures number of sales, not revenue — a category with many cheap sales could still make less money.',
            level: 'applied',
          },
          {
            id: 'data-analytics-course-5-cp-2',
            courseSlug: 'data-analytics-course-5',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Use SQL JOINs to combine data from two tables',
            onetSkills: ['Mathematics', 'Inductive Reasoning'],
            scenario:
              'Orders live in an `orders` table and customer names live in a `customers` table. Both share a `customer_id` column. A stakeholder wants each order shown with the customer\'s name.',
            question: 'How do you combine the tables?',
            options: [
              { id: 'a', text: 'Copy and paste the customers table next to the orders table' },
              { id: 'b', text: 'Run two separate queries and match rows by eye' },
              { id: 'c', text: 'JOIN the tables ON orders.customer_id = customers.customer_id' },
              { id: 'd', text: 'UNION the two tables together' },
            ],
            correctOptionId: 'c',
            explanation:
              'A JOIN links rows across tables using the shared key. UNION stacks rows on top of each other, which mixes orders and customers instead of matching them.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'data-analytics-course-6',
        courseName: 'Share Data Through the Art of Visualization',
        programSlug: 'data-analytics-professional-certificate-google',
        checkpoints: [
          {
            id: 'data-analytics-course-6-cp-1',
            courseSlug: 'data-analytics-course-6',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Pick the right chart for the data story',
            onetSkills: ['Visualization'],
            scenario:
              'You need to show how monthly website visits changed over the past year so leadership can see the trend at a glance.',
            question: 'Which chart fits best?',
            options: [
              { id: 'a', text: 'A pie chart with one slice per month' },
              { id: 'b', text: 'A line chart with months on the x-axis and visits on the y-axis' },
              { id: 'c', text: 'A table listing all twelve numbers' },
              { id: 'd', text: 'A scatter plot of visits versus visits' },
            ],
            correctOptionId: 'b',
            explanation:
              'Line charts are made for change over time. Pie charts show parts of a whole at one moment, and a 12-slice pie hides the trend completely.',
            level: 'applied',
          },
          {
            id: 'data-analytics-course-6-cp-2',
            courseSlug: 'data-analytics-course-6',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Build honest, clear charts in Tableau',
            onetSkills: ['Visualization', 'Written Expression'],
            scenario:
              'A teammate\'s Tableau bar chart makes a 2% sales increase look huge because the y-axis starts at 98 instead of 0. It is going into a board presentation tomorrow.',
            question: 'What should you suggest?',
            options: [
              { id: 'a', text: 'Leave it — a dramatic chart gets more attention' },
              { id: 'b', text: 'Start the y-axis at 0 so the bar heights honestly show the size of the change' },
              { id: 'c', text: 'Switch to 3D bars to make it look more professional' },
              { id: 'd', text: 'Remove the axis labels so no one notices' },
            ],
            correctOptionId: 'b',
            explanation:
              'Bar charts compare lengths, so a truncated axis exaggerates differences and misleads viewers. Honest axes protect your credibility — and the company\'s decisions.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'data-analytics-course-7',
        courseName: 'Data Analysis with R Programming',
        programSlug: 'data-analytics-professional-certificate-google',
        checkpoints: [
          {
            id: 'data-analytics-course-7-cp-1',
            courseSlug: 'data-analytics-course-7',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Load and inspect a dataset in R',
            onetSkills: ['Programming'],
            scenario:
              'You just loaded a CSV of survey responses into an R data frame called `survey`. Before analyzing, you want a quick look at the first few rows and the column types.',
            question: 'Which functions give you that quick look?',
            options: [
              { id: 'a', text: 'head(survey) and glimpse(survey)' },
              { id: 'b', text: 'delete(survey) and clean(survey)' },
              { id: 'c', text: 'print every row with View() and read them all' },
              { id: 'd', text: 'plot(survey) before checking anything' },
            ],
            correctOptionId: 'a',
            explanation:
              'head() shows the first rows and glimpse() (from tidyverse) shows each column and its type. Inspecting data before analysis catches problems early.',
            level: 'applied',
          },
          {
            id: 'data-analytics-course-7-cp-2',
            courseSlug: 'data-analytics-course-7',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Filter and summarize data with tidyverse code',
            onetSkills: ['Programming', 'Mathematics'],
            scenario:
              'Using R, you need the average rating for only the "online" orders in a data frame `orders` with columns `channel` and `rating`.',
            question: 'Which tidyverse pipeline does this correctly?',
            options: [
              { id: 'a', text: 'orders %>% summarize(mean(rating)) %>% filter(channel == "online")' },
              { id: 'b', text: 'orders %>% filter(channel == "online") %>% summarize(avg = mean(rating))' },
              { id: 'c', text: 'mean(orders$channel)' },
              { id: 'd', text: 'orders %>% select(rating)' },
            ],
            correctOptionId: 'b',
            explanation:
              'Filter first, then summarize — order matters in a pipeline. Option A averages all orders before filtering, so the filter does nothing useful.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'data-analytics-course-8',
        courseName: 'Google Data Analytics Capstone',
        programSlug: 'data-analytics-professional-certificate-google',
        checkpoints: [
          {
            id: 'data-analytics-course-8-cp-1',
            courseSlug: 'data-analytics-course-8',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Plan an end-to-end analysis project',
            onetSkills: ['Complex Problem Solving', 'Time Management'],
            scenario:
              'A bike-share company gives you a year of ride data and asks how casual riders differ from members. You have one week and must present recommendations to marketing.',
            question: 'Which plan sets you up to succeed?',
            options: [
              { id: 'a', text: 'Spend the whole week making one beautiful dashboard, then improvise the talk' },
              { id: 'b', text: 'Define the question, clean the data, analyze rider patterns, then build visuals and recommendations' },
              { id: 'c', text: 'Skip cleaning since a year of data is too big to check' },
              { id: 'd', text: 'Survey your friends about why they ride bikes' },
            ],
            correctOptionId: 'b',
            explanation:
              'Following the full process — ask, prepare, process, analyze, share, act — keeps the project on track. Visuals come after analysis, not instead of it.',
            level: 'job_ready',
          },
          {
            id: 'data-analytics-course-8-cp-2',
            courseSlug: 'data-analytics-course-8',
            programSlug: 'data-analytics-professional-certificate-google',
            demonstratedSkill: 'Present findings with clear, supported recommendations',
            onetSkills: ['Complex Problem Solving', 'Systems Analysis'],
            scenario:
              'Your capstone analysis shows casual riders take longer weekend rides than members. Marketing asks, "So what should we do?"',
            question: 'What is the strongest way to answer?',
            options: [
              { id: 'a', text: 'Repeat the statistics until they understand' },
              { id: 'b', text: 'Say the data cannot tell us what to do' },
              { id: 'c', text: 'Recommend weekend-focused membership offers, tied directly to the riding pattern you found' },
              { id: 'd', text: 'Suggest a price cut, since price always drives behavior' },
            ],
            correctOptionId: 'c',
            explanation:
              'Analysts turn findings into actions: the recommendation should follow directly from the evidence. Option D guesses at a cause the data never showed.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // DATA SCIENCE (IBM)
  // ==========================================================================
  {
    programSlug: 'data-science-professional-certificate-ibm',
    programTitle: 'Data Science Professional Certificate',
    whyItMatters:
      'These checkpoints show employers you can use Python, SQL, and machine learning to solve real business problems.',
    courses: [
      {
        courseSlug: 'data-science-course-2',
        courseName: 'Tools for Data Science',
        programSlug: 'data-science-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'data-science-course-2-cp-1',
            courseSlug: 'data-science-course-2',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Choose the right tool for a data task',
            onetSkills: ['Technology Design', 'Equipment Selection'],
            scenario:
              'Your team wants to explore a dataset in Python, mixing code, charts, and written notes in one shareable document.',
            question: 'Which tool fits this need best?',
            options: [
              { id: 'a', text: 'A plain text editor like Notepad' },
              { id: 'b', text: 'A Jupyter Notebook' },
              { id: 'c', text: 'A PowerPoint deck' },
              { id: 'd', text: 'A PDF reader' },
            ],
            correctOptionId: 'b',
            explanation:
              'Jupyter Notebooks combine runnable code, output charts, and markdown notes in one file — exactly the explore-and-share workflow data teams use.',
            level: 'foundation',
          },
          {
            id: 'data-science-course-2-cp-2',
            courseSlug: 'data-science-course-2',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Use Git to keep project work safe and shared',
            onetSkills: ['Technology Design'],
            scenario:
              'You finished a notebook on your laptop. Your teammate needs it, and you want a backup in case your laptop fails.',
            question: 'What is the standard professional way to share and back it up?',
            options: [
              { id: 'a', text: 'Email the file back and forth and keep copies named final_v2, final_v3' },
              { id: 'b', text: 'Commit it to Git and push it to a shared repository like GitHub' },
              { id: 'c', text: 'Save it only on your desktop' },
              { id: 'd', text: 'Paste the code into a chat message' },
            ],
            correctOptionId: 'b',
            explanation:
              'Git tracks every version, and pushing to a shared repository backs up your work and lets teammates pull the latest copy. Emailing versions quickly creates confusion about which file is current.',
            level: 'foundation',
          },
        ],
      },
      {
        courseSlug: 'data-science-course-3',
        courseName: 'Data Science Methodology',
        programSlug: 'data-science-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'data-science-course-3-cp-1',
            courseSlug: 'data-science-course-3',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Start a data project by defining the business problem',
            onetSkills: ['Systems Analysis', 'Science'],
            scenario:
              'A hospital asks your team to "use AI to help with patient readmissions." Everyone is excited to start building a model right away.',
            question: 'According to data science methodology, what comes first?',
            options: [
              { id: 'a', text: 'Business understanding — agree on exactly what problem you are solving and how success is measured' },
              { id: 'b', text: 'Pick the most advanced model available' },
              { id: 'c', text: 'Buy more data from a vendor' },
              { id: 'd', text: 'Deploy a prototype to the hospital immediately' },
            ],
            correctOptionId: 'a',
            explanation:
              'Every methodology (like CRISP-DM) starts with business understanding. A model built before the problem is defined often answers the wrong question.',
            level: 'foundation',
          },
          {
            id: 'data-science-course-3-cp-2',
            courseSlug: 'data-science-course-3',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Evaluate whether a model is ready for real use',
            onetSkills: ['Systems Evaluation'],
            scenario:
              'Your readmission model looks accurate on the data you trained it with. A teammate says, "Great, ship it to the hospital today."',
            question: 'What should happen before deployment?',
            options: [
              { id: 'a', text: 'Nothing — training accuracy is the final word' },
              { id: 'b', text: 'Evaluate the model on data it has never seen and review results with the hospital' },
              { id: 'c', text: 'Retrain it on the same data a few more times' },
              { id: 'd', text: 'Rename the model so it sounds more trustworthy' },
            ],
            correctOptionId: 'b',
            explanation:
              'The evaluation stage tests the model on unseen data and checks it against the business need. High training accuracy alone can hide a model that fails on new patients.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'data-science-course-4',
        courseName: 'Python for Data Science, AI & Development',
        programSlug: 'data-science-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'data-science-course-4-cp-1',
            courseSlug: 'data-science-course-4',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Read and fix simple Python logic',
            onetSkills: ['Programming'],
            scenario:
              'A teammate\'s Python script should print "High" when sales is over 100. It reads: if sales = 100: print("High"). Python shows a syntax error.',
            question: 'What is wrong?',
            options: [
              { id: 'a', text: 'print needs capital P' },
              { id: 'b', text: 'The condition uses = (assignment) and the wrong value; it should be if sales > 100:' },
              { id: 'c', text: 'Python cannot compare numbers' },
              { id: 'd', text: 'if statements need a semicolon at the end' },
            ],
            correctOptionId: 'b',
            explanation:
              'A single = assigns a value; comparisons use operators like > or ==. The condition also needs "over 100", so the fix is `if sales > 100:`.',
            level: 'foundation',
          },
          {
            id: 'data-science-course-4-cp-2',
            courseSlug: 'data-science-course-4',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Use pandas to load and filter a dataset',
            onetSkills: ['Programming', 'Mathematics'],
            scenario:
              'You loaded sales data with df = pd.read_csv("sales.csv"). Your manager wants only the rows where the region column equals "West".',
            question: 'Which line does that?',
            options: [
              { id: 'a', text: 'df.drop("West")' },
              { id: 'b', text: 'df["region" == "West"]' },
              { id: 'c', text: 'df[df["region"] == "West"]' },
              { id: 'd', text: 'pd.filter(df, "West")' },
            ],
            correctOptionId: 'c',
            explanation:
              'Pandas filters rows with a boolean mask: df[df["region"] == "West"]. Option B compares the string "region" to "West", which is always False.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'data-science-course-5',
        courseName: 'Python Project for Data Science',
        programSlug: 'data-science-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'data-science-course-5-cp-1',
            courseSlug: 'data-science-course-5',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Pull data from a web API in Python',
            onetSkills: ['Programming'],
            scenario:
              'Your project needs current stock data. A finance website offers a free API that returns JSON. You have the requests library installed.',
            question: 'What is the right approach?',
            options: [
              { id: 'a', text: 'Call the API with requests.get(), check the status code, then parse the JSON response' },
              { id: 'b', text: 'Manually copy numbers from the website into your script every day' },
              { id: 'c', text: 'Guess the values since stocks change anyway' },
              { id: 'd', text: 'Download the website\'s logo and analyze that' },
            ],
            correctOptionId: 'a',
            explanation:
              'APIs are how programs fetch live data: request, check the response succeeded, then parse the JSON. Manual copying breaks the moment data updates.',
            level: 'applied',
          },
          {
            id: 'data-science-course-5-cp-2',
            courseSlug: 'data-science-course-5',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Scrape a web page responsibly when no API exists',
            onetSkills: ['Programming', 'Complex Problem Solving'],
            scenario:
              'You need a table of company revenues from a public web page that has no API. You plan to use Python with BeautifulSoup.',
            question: 'What is the correct workflow?',
            options: [
              { id: 'a', text: 'Screenshot the page and type the numbers in by hand' },
              { id: 'b', text: 'Fetch the page HTML, parse the table tags with BeautifulSoup, and load the rows into a DataFrame' },
              { id: 'c', text: 'Request the page thousands of times per second to get it faster' },
              { id: 'd', text: 'Edit the website\'s HTML so the table is easier to read' },
            ],
            correctOptionId: 'b',
            explanation:
              'Web scraping means fetching the HTML and parsing the elements you need into structured data. Hammering a site with rapid requests can get you blocked and is bad practice.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'data-science-course-6',
        courseName: 'Databases and SQL for Data Science with Python',
        programSlug: 'data-science-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'data-science-course-6-cp-1',
            courseSlug: 'data-science-course-6',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Aggregate data with GROUP BY in SQL',
            onetSkills: ['Programming', 'Database Management'],
            scenario:
              'A manager wants total sales per store from a `sales` table with columns `store_id` and `amount`. Your query returns one giant total instead of one row per store.',
            question: 'What is missing from your query?',
            options: [
              { id: 'a', text: 'An ORDER BY clause' },
              { id: 'b', text: 'A GROUP BY store_id clause with SUM(amount)' },
              { id: 'c', text: 'A second SELECT statement' },
              { id: 'd', text: 'A WHERE amount > 0 filter' },
            ],
            correctOptionId: 'b',
            explanation:
              'SUM without GROUP BY collapses everything into one total. GROUP BY store_id makes SQL calculate the sum separately for each store.',
            level: 'applied',
          },
          {
            id: 'data-science-course-6-cp-2',
            courseSlug: 'data-science-course-6',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Query a database from Python for analysis',
            onetSkills: ['Programming', 'Database Management'],
            scenario:
              'Your analysis notebook needs data that lives in a company SQL database, and you want the results in a pandas DataFrame.',
            question: 'What is the standard approach?',
            options: [
              { id: 'a', text: 'Export the whole database to CSV by hand every morning' },
              { id: 'b', text: 'Connect from Python and use pd.read_sql() with your query' },
              { id: 'c', text: 'Retype the rows you remember into a list' },
              { id: 'd', text: 'Ask IT to print the tables' },
            ],
            correctOptionId: 'b',
            explanation:
              'pd.read_sql() runs your query through a database connection and returns a DataFrame, keeping the analysis repeatable and always current.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'data-science-course-7',
        courseName: 'Data Analysis with Python',
        programSlug: 'data-science-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'data-science-course-7-cp-1',
            courseSlug: 'data-science-course-7',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Handle missing values before analysis',
            onetSkills: ['Mathematics', 'Critical Thinking'],
            scenario:
              'In a used-car dataset, 5% of the price values are missing. You need price for your analysis and do not want to throw away the other useful columns in those rows.',
            question: 'What is a reasonable way to handle the missing prices?',
            options: [
              { id: 'a', text: 'Replace missing prices with zero' },
              { id: 'b', text: 'Fill them with the mean or median price, and note that you did' },
              { id: 'c', text: 'Delete the price column entirely' },
              { id: 'd', text: 'Make up prices that feel right for each car' },
            ],
            correctOptionId: 'b',
            explanation:
              'Imputing with the mean or median is a standard, documented fix for a small share of missing values. Zeros would drag the average down and badly distort the analysis.',
            level: 'applied',
          },
          {
            id: 'data-science-course-7-cp-2',
            courseSlug: 'data-science-course-7',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Interpret correlation without overclaiming cause',
            onetSkills: ['Science', 'Critical Thinking'],
            scenario:
              'Your analysis finds a strong positive correlation between ice cream sales and air conditioner sales. A teammate concludes ice cream ads must be selling air conditioners.',
            question: 'What is the better interpretation?',
            options: [
              { id: 'a', text: 'The teammate is right — strong correlation proves cause' },
              { id: 'b', text: 'The correlation is probably a coding error' },
              { id: 'c', text: 'A third factor, like hot weather, likely drives both — correlation alone does not prove causation' },
              { id: 'd', text: 'Air conditioners must be causing ice cream sales instead' },
            ],
            correctOptionId: 'c',
            explanation:
              'Correlation shows two things move together, not that one causes the other. Hot weather is a classic confounding variable driving both sales.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'data-science-course-8',
        courseName: 'Data Visualization with Python',
        programSlug: 'data-science-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'data-science-course-8-cp-1',
            courseSlug: 'data-science-course-8',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Choose and build the right plot in Matplotlib',
            onetSkills: ['Visualization'],
            scenario:
              'You want to check whether car price is related to engine size in your dataset, using a Matplotlib chart your team can read quickly.',
            question: 'Which plot shows that relationship best?',
            options: [
              { id: 'a', text: 'A scatter plot with engine size on one axis and price on the other' },
              { id: 'b', text: 'A pie chart of price ranges' },
              { id: 'c', text: 'A single bar showing average price' },
              { id: 'd', text: 'A word cloud of car model names' },
            ],
            correctOptionId: 'a',
            explanation:
              'Scatter plots show how two numeric variables move together, making patterns like "bigger engines cost more" visible at a glance.',
            level: 'applied',
          },
          {
            id: 'data-science-course-8-cp-2',
            courseSlug: 'data-science-course-8',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Build an interactive dashboard stakeholders can explore',
            onetSkills: ['Visualization', 'Written Expression'],
            scenario:
              'Leadership wants to explore monthly sales by region themselves — filtering, hovering for details — instead of waiting for you to remake static charts each week.',
            question: 'Which Python approach fits?',
            options: [
              { id: 'a', text: 'Email a new PNG chart every time they have a question' },
              { id: 'b', text: 'Build an interactive dashboard with Plotly Dash' },
              { id: 'c', text: 'Send them the raw CSV and let them figure it out' },
              { id: 'd', text: 'Print the charts and post them in the break room' },
            ],
            correctOptionId: 'b',
            explanation:
              'Plotly Dash builds interactive web dashboards with filters and hover details, letting stakeholders answer their own follow-up questions.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'data-science-course-9',
        courseName: 'Machine Learning with Python',
        programSlug: 'data-science-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'data-science-course-9-cp-1',
            courseSlug: 'data-science-course-9',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Diagnose and fix an overfitting model',
            onetSkills: ['Science', 'Systems Analysis'],
            scenario:
              'Your scikit-learn model scores 99% on training data but only 65% on the test set. Your manager asks why it does so poorly on new data.',
            question: 'What is happening, and what is one good fix?',
            options: [
              { id: 'a', text: 'The model is underfitting — make it more complex' },
              { id: 'b', text: 'The model is overfitting — it memorized training data; simplify it or use more training data' },
              { id: 'c', text: 'The test set is broken — test on the training data instead' },
              { id: 'd', text: 'Report the 99% number since it is higher' },
            ],
            correctOptionId: 'b',
            explanation:
              'A big gap between training and test scores is the signature of overfitting. Simplifying the model, regularization, or more data helps it generalize. Reporting training accuracy would mislead everyone.',
            level: 'applied',
          },
          {
            id: 'data-science-course-9-cp-2',
            courseSlug: 'data-science-course-9',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Pick the right type of machine learning for a problem',
            onetSkills: ['Mathematics', 'Programming'],
            scenario:
              'A bank wants to predict whether each loan applicant will repay (yes or no) based on past applicants whose outcomes are already known.',
            question: 'What kind of machine learning problem is this?',
            options: [
              { id: 'a', text: 'Classification — supervised learning with labeled yes/no outcomes' },
              { id: 'b', text: 'Clustering — group applicants without labels' },
              { id: 'c', text: 'Regression — predict a continuous number' },
              { id: 'd', text: 'No ML is possible without millions of rows' },
            ],
            correctOptionId: 'a',
            explanation:
              'Predicting a yes/no category from labeled history is classification. Regression predicts numbers, and clustering is for data without known outcomes.',
            level: 'job_ready',
          },
          {
            id: 'data-science-course-9-cp-3',
            courseSlug: 'data-science-course-9',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Evaluate a classifier beyond plain accuracy',
            onetSkills: ['Mathematics', 'Systems Analysis'],
            scenario:
              'Only 2% of transactions in your fraud dataset are fraud. A teammate\'s model "predicts no fraud, ever" and proudly reports 98% accuracy.',
            question: 'Why is that model useless, and what should you check instead?',
            options: [
              { id: 'a', text: 'It is fine — 98% accuracy is excellent' },
              { id: 'b', text: 'It catches zero fraud; check recall and precision on the fraud class instead' },
              { id: 'c', text: 'Accuracy is too low; aim for 100%' },
              { id: 'd', text: 'The dataset needs more non-fraud examples' },
            ],
            correctOptionId: 'b',
            explanation:
              'With imbalanced classes, accuracy hides total failure on the rare class. Precision and recall (or the confusion matrix) show whether fraud is actually being caught.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'data-science-course-10',
        courseName: 'Applied Data Science Capstone',
        programSlug: 'data-science-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'data-science-course-10-cp-1',
            courseSlug: 'data-science-course-10',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Run a full data science project from raw data to model',
            onetSkills: ['Complex Problem Solving', 'Time Management'],
            scenario:
              'Your capstone asks you to predict rocket landing success from launch records. You have raw data from an API, two weeks, and a final presentation to deliver.',
            question: 'What is the right order of work?',
            options: [
              { id: 'a', text: 'Train the model first, then look at the data if there is time' },
              { id: 'b', text: 'Collect and clean the data, explore it, engineer features, train and evaluate models, then present' },
              { id: 'c', text: 'Build the presentation slides first and fill in results later' },
              { id: 'd', text: 'Skip evaluation since the deadline is tight' },
            ],
            correctOptionId: 'b',
            explanation:
              'Real projects follow the pipeline: data first, understanding second, modeling third, communication last. Models trained on unexplored, dirty data produce results you cannot defend.',
            level: 'job_ready',
          },
          {
            id: 'data-science-course-10-cp-2',
            courseSlug: 'data-science-course-10',
            programSlug: 'data-science-professional-certificate-ibm',
            demonstratedSkill: 'Explain model results to a non-technical audience',
            onetSkills: ['Complex Problem Solving'],
            scenario:
              'In your final presentation, an executive asks, "Should we trust this model\'s predictions?" Your model scored 83% accuracy on held-out test data.',
            question: 'What is the best answer?',
            options: [
              { id: 'a', text: 'Recite the model\'s hyperparameters in detail' },
              { id: 'b', text: 'Say yes, models are always right' },
              { id: 'c', text: 'Explain it was right 83% of the time on data it never saw, and describe where it tends to make mistakes' },
              { id: 'd', text: 'Say no model can ever be trusted' },
            ],
            correctOptionId: 'c',
            explanation:
              'Executives need plain-language performance on unseen data plus honest limits. That builds trust better than jargon or overconfidence.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // AI PROFESSIONAL DEVELOPER (IBM)
  // ==========================================================================
  {
    programSlug: 'ai-professional-developer-certificate-ibm',
    programTitle: 'AI Professional Practitioner Certificate',
    whyItMatters:
      'These checkpoints prove you can build and ship real AI-powered applications, not just chat about AI.',
    courses: [
      {
        courseSlug: 'ai-dev-course-1',
        courseName: 'Introduction to Software Engineering',
        programSlug: 'ai-professional-developer-certificate-ibm',
        checkpoints: [
          {
            id: 'ai-dev-course-1-cp-1',
            courseSlug: 'ai-dev-course-1',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Follow the software development lifecycle on a team',
            onetSkills: ['Systems Analysis'],
            scenario:
              'Your team is starting a new app. A teammate wants to begin coding today, before anyone has written down what the app must do.',
            question: 'Why is gathering requirements first the better move?',
            options: [
              { id: 'a', text: 'It is not — coding first is always faster' },
              { id: 'b', text: 'Knowing what users need prevents building the wrong features and redoing work later' },
              { id: 'c', text: 'Requirements documents impress managers' },
              { id: 'd', text: 'Coding is impossible without a 100-page spec' },
            ],
            correctOptionId: 'b',
            explanation:
              'The lifecycle starts with requirements because fixing a misunderstanding on paper is far cheaper than rewriting finished code. You do not need a huge spec — just shared clarity.',
            level: 'foundation',
          },
          {
            id: 'ai-dev-course-1-cp-2',
            courseSlug: 'ai-dev-course-1',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Use version control to work safely on shared code',
            onetSkills: ['Complex Problem Solving'],
            scenario:
              'You need to add a feature to your team\'s app, but you are worried about breaking the working code everyone depends on.',
            question: 'What is the standard Git practice?',
            options: [
              { id: 'a', text: 'Edit the main branch directly and hope for the best' },
              { id: 'b', text: 'Create a branch, build the feature there, then merge after review' },
              { id: 'c', text: 'Copy the whole project folder and email your version around' },
              { id: 'd', text: 'Wait until everyone else stops working on the project' },
            ],
            correctOptionId: 'b',
            explanation:
              'Branches isolate your changes so the main code stays stable, and review before merging catches problems early. This is how professional teams ship every day.',
            level: 'foundation',
          },
        ],
      },
      {
        courseSlug: 'ai-dev-course-2',
        courseName: 'Introduction to Artificial Intelligence (AI)',
        programSlug: 'ai-professional-developer-certificate-ibm',
        checkpoints: [
          {
            id: 'ai-dev-course-2-cp-1',
            courseSlug: 'ai-dev-course-2',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Identify problems machine learning can and cannot solve',
            onetSkills: ['Critical Thinking', 'Science'],
            scenario:
              'A retail client asks if AI can help. They have years of sales records and want to predict which products will sell well next season.',
            question: 'Is this a good fit for machine learning, and why?',
            options: [
              { id: 'a', text: 'No — AI only works with images' },
              { id: 'b', text: 'Yes — there is historical data with patterns a model can learn to make predictions' },
              { id: 'c', text: 'No — predictions require a fortune teller, not software' },
              { id: 'd', text: 'Yes, but only if they delete the historical data first' },
            ],
            correctOptionId: 'b',
            explanation:
              'Machine learning shines when there is plenty of historical data containing patterns related to what you want to predict. The past sales records are exactly that.',
            level: 'foundation',
          },
          {
            id: 'ai-dev-course-2-cp-2',
            courseSlug: 'ai-dev-course-2',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Spot bias risks in an AI system before launch',
            onetSkills: ['Critical Thinking', 'Active Learning'],
            scenario:
              'Your company built a resume-screening AI trained only on resumes of employees hired in the past, when the company hired mostly from one background.',
            question: 'What risk should you raise?',
            options: [
              { id: 'a', text: 'None — AI is neutral by definition' },
              { id: 'b', text: 'The model may learn the past hiring bias and unfairly filter out qualified candidates' },
              { id: 'c', text: 'The model will be too slow to use' },
              { id: 'd', text: 'Resumes cannot be processed by computers' },
            ],
            correctOptionId: 'b',
            explanation:
              'Models learn whatever patterns are in their training data — including unfair ones. Biased history in means biased decisions out, so the training data needs review before launch.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'ai-dev-course-3',
        courseName: 'Generative AI: Introduction and Applications',
        programSlug: 'ai-professional-developer-certificate-ibm',
        checkpoints: [
          {
            id: 'ai-dev-course-3-cp-1',
            courseSlug: 'ai-dev-course-3',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Verify AI-generated content before using it at work',
            onetSkills: ['Systems Analysis'],
            scenario:
              'You ask an AI chatbot for statistics to include in a client report. It gives you confident numbers with a source. The report goes out tomorrow.',
            question: 'What should you do with those numbers?',
            options: [
              { id: 'a', text: 'Use them as-is — the AI cited a source' },
              { id: 'b', text: 'Check the numbers against the actual source, since AI can generate convincing but false information' },
              { id: 'c', text: 'Round them up to be safe' },
              { id: 'd', text: 'Remove all statistics from the report' },
            ],
            correctOptionId: 'b',
            explanation:
              'Large language models can "hallucinate" — produce plausible but wrong facts and even fake citations. Verifying against real sources is a core professional habit when using generative AI.',
            level: 'foundation',
          },
          {
            id: 'ai-dev-course-3-cp-2',
            courseSlug: 'ai-dev-course-3',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Match generative AI capabilities to a business task',
            onetSkills: ['Technology Design'],
            scenario:
              'A small business owner wants help writing first drafts of product descriptions, summarizing customer reviews, and answering common customer questions.',
            question: 'Which tool category fits all three needs?',
            options: [
              { id: 'a', text: 'A spreadsheet program' },
              { id: 'b', text: 'A large language model (LLM) based assistant' },
              { id: 'c', text: 'An image generation model' },
              { id: 'd', text: 'A firewall' },
            ],
            correctOptionId: 'b',
            explanation:
              'Drafting, summarizing, and question-answering are all text tasks — the core strengths of LLMs. Image models and spreadsheets solve different problems.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'ai-dev-course-4',
        courseName: 'Generative AI: Prompt Engineering Basics',
        programSlug: 'ai-professional-developer-certificate-ibm',
        checkpoints: [
          {
            id: 'ai-dev-course-4-cp-1',
            courseSlug: 'ai-dev-course-4',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Write a clear, specific prompt that gets usable output',
            onetSkills: ['Written Expression', 'Fluency of Ideas'],
            scenario:
              'You ask an AI, "Write something about our gym," and get generic, unusable text. You need a friendly 100-word welcome email for new members mentioning free first classes.',
            question: 'How should you improve the prompt?',
            options: [
              { id: 'a', text: 'Repeat the same prompt until the output improves' },
              { id: 'b', text: 'State the format, audience, tone, length, and key detail: a 100-word friendly welcome email for new members mentioning the free first class' },
              { id: 'c', text: 'Type the prompt in all capital letters' },
              { id: 'd', text: 'Ask for 10,000 words and cut it down' },
            ],
            correctOptionId: 'b',
            explanation:
              'Specific prompts — role, audience, tone, length, must-include details — give the model what it needs. Vague input produces vague output no matter how many times you retry.',
            level: 'applied',
          },
          {
            id: 'ai-dev-course-4-cp-2',
            courseSlug: 'ai-dev-course-4',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Use examples in prompts to control output format',
            onetSkills: ['Originality', 'Written Expression'],
            scenario:
              'You need an AI to turn messy customer feedback into a consistent format: sentiment, topic, one-line summary. Plain instructions keep producing inconsistent results.',
            question: 'Which prompting technique helps most?',
            options: [
              { id: 'a', text: 'Few-shot prompting — show two or three example inputs with correctly formatted outputs' },
              { id: 'b', text: 'Making the prompt shorter so the AI focuses' },
              { id: 'c', text: 'Asking the AI to try harder' },
              { id: 'd', text: 'Switching to an image model' },
            ],
            correctOptionId: 'a',
            explanation:
              'Few-shot examples show the model the exact pattern to follow, which beats describing the format in words. It is one of the most reliable prompt engineering tools.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'ai-dev-course-5',
        courseName: 'Python for Data Science, AI & Development',
        programSlug: 'ai-professional-developer-certificate-ibm',
        checkpoints: [
          {
            id: 'ai-dev-course-5-cp-1',
            courseSlug: 'ai-dev-course-5',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Work with Python lists and loops to process data',
            onetSkills: ['Programming'],
            scenario:
              'You have a Python list of prices: prices = [19.99, 5.50, 12.00]. Your boss wants each price with 10% tax added, in a new list.',
            question: 'Which code does this correctly?',
            options: [
              { id: 'a', text: 'taxed = prices + 0.10' },
              { id: 'b', text: 'taxed = [p * 1.10 for p in prices]' },
              { id: 'c', text: 'taxed = prices * 1.10' },
              { id: 'd', text: 'taxed = sum(prices)' },
            ],
            correctOptionId: 'b',
            explanation:
              'A list comprehension applies the math to each item. Adding a number to a list errors out, and multiplying a list by a number repeats the list instead of doing math.',
            level: 'applied',
          },
          {
            id: 'ai-dev-course-5-cp-2',
            courseSlug: 'ai-dev-course-5',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Explore a dataset with pandas before building AI on it',
            onetSkills: ['Programming', 'Mathematics'],
            scenario:
              'You receive a CSV of 50,000 support tickets to train an AI classifier. Before training, you want a quick summary: row count, column types, and missing values.',
            question: 'Which pandas tools give you that overview?',
            options: [
              { id: 'a', text: 'df.info() and df.describe()' },
              { id: 'b', text: 'print(df) and read all 50,000 rows' },
              { id: 'c', text: 'df.delete_missing()' },
              { id: 'd', text: 'Opening the CSV in Notepad' },
            ],
            correctOptionId: 'a',
            explanation:
              'df.info() shows columns, types, and non-null counts; df.describe() summarizes the numbers. Profiling data first prevents training AI on broken inputs.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'ai-dev-course-6',
        courseName: 'Developing AI Applications with Python and Flask',
        programSlug: 'ai-professional-developer-certificate-ibm',
        checkpoints: [
          {
            id: 'ai-dev-course-6-cp-1',
            courseSlug: 'ai-dev-course-6',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Serve an AI model through a Flask web endpoint',
            onetSkills: ['Programming', 'Technology Design'],
            scenario:
              'You built a sentiment analysis function in Python. Now the website team needs to send it text and get results over HTTP from their app.',
            question: 'What should you build?',
            options: [
              { id: 'a', text: 'A Flask route that accepts the text in a request and returns the result as JSON' },
              { id: 'b', text: 'A shared Word document where they paste text and you reply' },
              { id: 'c', text: 'A scheduled job that runs once a week' },
              { id: 'd', text: 'A desktop-only script they cannot reach' },
            ],
            correctOptionId: 'a',
            explanation:
              'Wrapping the function in a Flask API route lets any app call it over HTTP and get JSON back — the standard way to expose AI features to other teams.',
            level: 'applied',
          },
          {
            id: 'ai-dev-course-6-cp-2',
            courseSlug: 'ai-dev-course-6',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Handle bad input gracefully in an AI web service',
            onetSkills: ['Programming', 'Systems Analysis'],
            scenario:
              'Your Flask sentiment API crashes with a 500 error whenever someone sends an empty request. The website team says it is breaking their page.',
            question: 'What is the right fix?',
            options: [
              { id: 'a', text: 'Tell the website team to never send empty requests' },
              { id: 'b', text: 'Validate the input and return a clear 400 error message when text is missing' },
              { id: 'c', text: 'Restart the server whenever it crashes' },
              { id: 'd', text: 'Remove error logging so the crashes are quieter' },
            ],
            correctOptionId: 'b',
            explanation:
              'APIs must validate input and fail gracefully with helpful error codes. You cannot control what callers send — only how your service responds.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'ai-dev-course-7',
        courseName: 'Building Generative AI-Powered Applications with Python',
        programSlug: 'ai-professional-developer-certificate-ibm',
        checkpoints: [
          {
            id: 'ai-dev-course-7-cp-1',
            courseSlug: 'ai-dev-course-7',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Use retrieval (RAG) to ground a chatbot in company documents',
            onetSkills: ['Systems Analysis', 'Technology Design'],
            scenario:
              'Your company chatbot keeps inventing answers about internal policies. The policies live in a folder of PDF documents the model never saw during training.',
            question: 'What is the standard fix?',
            options: [
              { id: 'a', text: 'Ask users to stop asking policy questions' },
              { id: 'b', text: 'Retrieval-augmented generation: search the policy documents and feed the relevant text into the prompt' },
              { id: 'c', text: 'Make the chatbot respond more confidently' },
              { id: 'd', text: 'Train a new model from scratch every time a policy changes' },
            ],
            correctOptionId: 'b',
            explanation:
              'RAG retrieves the right document passages and gives them to the model as context, so answers come from real company content instead of guesses. It also updates instantly when documents change.',
            level: 'job_ready',
          },
          {
            id: 'ai-dev-course-7-cp-2',
            courseSlug: 'ai-dev-course-7',
            programSlug: 'ai-professional-developer-certificate-ibm',
            demonstratedSkill: 'Use embeddings and a vector database for semantic search',
            onetSkills: ['Programming', 'Technology Design'],
            scenario:
              'Users search your help center for "money back" but get nothing, because the articles say "refund." Keyword search cannot connect the two phrases.',
            question: 'What approach solves this?',
            options: [
              { id: 'a', text: 'Add every possible synonym to every article by hand' },
              { id: 'b', text: 'Embed articles and queries as vectors and search by meaning in a vector database' },
              { id: 'c', text: 'Tell users which exact words to type' },
              { id: 'd', text: 'Delete the articles that are hard to find' },
            ],
            correctOptionId: 'b',
            explanation:
              'Embeddings turn text into vectors where similar meanings sit close together, so "money back" finds "refund" without manual synonym lists. This is semantic search.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // SOFTWARE DEVELOPER (IBM)
  // ==========================================================================
  {
    programSlug: 'software-developer-professional-certificate-ibm',
    programTitle: 'Software Developer Professional Certificate',
    whyItMatters:
      'These checkpoints show employers you can write, debug, and ship code the way real development teams do.',
    courses: [
      {
        courseSlug: 'software-dev-course-1',
        courseName: 'Introduction to Software Engineering',
        programSlug: 'software-developer-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'software-dev-course-1-cp-1',
            courseSlug: 'software-dev-course-1',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Understand how agile teams plan and deliver work',
            onetSkills: ['Coordination', 'Systems Analysis'],
            scenario:
              'You join a team that works in two-week sprints. At the start of each sprint, the team picks a small set of tasks to finish and demo.',
            question: 'Why do agile teams work in short sprints instead of planning a whole year of work up front?',
            options: [
              { id: 'a', text: 'Short sprints let the team deliver working software often and adjust based on feedback' },
              { id: 'b', text: 'Sprints exist so managers can schedule more meetings' },
              { id: 'c', text: 'Yearly plans are illegal in software' },
              { id: 'd', text: 'Sprints mean no one has to write any plans at all' },
            ],
            correctOptionId: 'a',
            explanation:
              'Agile favors frequent delivery and feedback over big upfront plans, because requirements change. Sprints still involve planning — just in smaller, adjustable pieces.',
            level: 'foundation',
          },
          {
            id: 'software-dev-course-1-cp-2',
            courseSlug: 'software-dev-course-1',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Write clear bug reports teammates can act on',
            onetSkills: ['Complex Problem Solving', 'Coordination'],
            scenario:
              'You find a bug: the signup button does nothing on your phone. You need to report it so a teammate can fix it without asking you twenty questions.',
            question: 'What makes the most useful bug report?',
            options: [
              { id: 'a', text: '"Signup is broken, please fix"' },
              { id: 'b', text: 'Steps to reproduce, what you expected, what actually happened, and your device/browser' },
              { id: 'c', text: 'A message saying the whole app is bad' },
              { id: 'd', text: 'Waiting to mention it at next month\'s meeting' },
            ],
            correctOptionId: 'b',
            explanation:
              'Reproduction steps plus expected-versus-actual behavior let a developer see the bug themselves — the fastest path to a fix. Vague reports bounce back with questions.',
            level: 'foundation',
          },
        ],
      },
      {
        courseSlug: 'software-dev-course-2',
        courseName: 'Introduction to HTML, CSS, & JavaScript',
        programSlug: 'software-developer-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'software-dev-course-2-cp-1',
            courseSlug: 'software-dev-course-2',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Know which web language handles which job',
            onetSkills: ['Programming', 'Technology Design'],
            scenario:
              'A client\'s web page has the right text, but everything is black-and-white and crammed together. The client wants colors, spacing, and nicer fonts.',
            question: 'Which technology do you change?',
            options: [
              { id: 'a', text: 'HTML — it controls how things look' },
              { id: 'b', text: 'CSS — it controls styling like colors, fonts, and spacing' },
              { id: 'c', text: 'JavaScript — looks can only change with code' },
              { id: 'd', text: 'The database' },
            ],
            correctOptionId: 'b',
            explanation:
              'HTML provides structure and content, CSS handles appearance, and JavaScript adds behavior. Styling changes belong in CSS.',
            level: 'foundation',
          },
          {
            id: 'software-dev-course-2-cp-2',
            courseSlug: 'software-dev-course-2',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Debug a JavaScript event that does not fire',
            onetSkills: ['Programming'],
            scenario:
              'Your page has <button id="save">Save</button>. Your JavaScript runs document.getElementById("submit").addEventListener("click", saveData). Clicking the button does nothing, and the console shows an error about null.',
            question: 'What is the bug?',
            options: [
              { id: 'a', text: 'Buttons cannot have click events' },
              { id: 'b', text: 'addEventListener is spelled wrong' },
              { id: 'c', text: 'The code looks up id "submit" but the button\'s id is "save", so getElementById returns null' },
              { id: 'd', text: 'JavaScript must be written inside the button tag' },
            ],
            correctOptionId: 'c',
            explanation:
              'getElementById returns null when no element matches, and calling addEventListener on null throws the error. Matching the id string to the actual element fixes it.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'software-dev-course-3',
        courseName: 'Getting Started with Git and GitHub',
        programSlug: 'software-developer-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'software-dev-course-3-cp-1',
            courseSlug: 'software-dev-course-3',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Resolve a git merge conflict without losing work',
            onetSkills: ['Programming'],
            scenario:
              'You merge your branch and Git reports a conflict in app.js. The file now shows sections marked with <<<<<<<, =======, and >>>>>>> containing your version and your teammate\'s version.',
            question: 'What do you do?',
            options: [
              { id: 'a', text: 'Delete the file and create a new empty one' },
              { id: 'b', text: 'Edit the file to keep the correct combined code, remove the conflict markers, then commit' },
              { id: 'c', text: 'Always keep your own version — you wrote it most recently' },
              { id: 'd', text: 'Force-push to make the conflict disappear' },
            ],
            correctOptionId: 'b',
            explanation:
              'A conflict means Git needs a human to decide how the two changes combine. You edit the marked section, keep what is correct from both sides, remove the markers, and commit the resolution.',
            level: 'applied',
          },
          {
            id: 'software-dev-course-3-cp-2',
            courseSlug: 'software-dev-course-3',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Use pull requests for team code review',
            onetSkills: ['Programming', 'Management of Material Resources'],
            scenario:
              'Your feature branch is finished and pushed to GitHub. Team rules say nothing merges to main without review.',
            question: 'What is the standard next step?',
            options: [
              { id: 'a', text: 'Merge to main yourself since the code works on your machine' },
              { id: 'b', text: 'Open a pull request describing the change and ask a teammate to review it' },
              { id: 'c', text: 'Delete the branch — pushed code merges automatically' },
              { id: 'd', text: 'Zip the code and send it to your manager' },
            ],
            correctOptionId: 'b',
            explanation:
              'A pull request packages your changes for review and discussion before they reach main. "Works on my machine" is exactly what review is designed to double-check.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'software-dev-course-4',
        courseName: 'Python for Data Science, AI & Development',
        programSlug: 'software-developer-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'software-dev-course-4-cp-1',
            courseSlug: 'software-dev-course-4',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Choose the right Python data structure',
            onetSkills: ['Programming', 'Critical Thinking'],
            scenario:
              'You are storing employee phone extensions so the app can look up an extension instantly by the employee\'s name.',
            question: 'Which Python structure fits best?',
            options: [
              { id: 'a', text: 'A list of phone numbers in random order' },
              { id: 'b', text: 'A dictionary mapping each name to its extension' },
              { id: 'c', text: 'One long string with all the numbers' },
              { id: 'd', text: 'A separate variable for every employee' },
            ],
            correctOptionId: 'b',
            explanation:
              'Dictionaries are built for key-to-value lookup: extensions[name] returns the answer instantly. A list would force you to search through every entry.',
            level: 'foundation',
          },
          {
            id: 'software-dev-course-4-cp-2',
            courseSlug: 'software-dev-course-4',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Handle errors in Python without crashing the program',
            onetSkills: ['Programming'],
            scenario:
              'Your script reads numbers users type in. When someone types "ten" instead of 10, int(user_input) crashes the whole program with a ValueError.',
            question: 'How do you make the script handle this gracefully?',
            options: [
              { id: 'a', text: 'Wrap the conversion in try/except ValueError and show a friendly retry message' },
              { id: 'b', text: 'Tell users that typing words is forbidden' },
              { id: 'c', text: 'Remove the int() call and do math on the text' },
              { id: 'd', text: 'Run the script twice — crashes only happen once' },
            ],
            correctOptionId: 'a',
            explanation:
              'try/except catches the error so you can respond helpfully instead of crashing. Programs should expect imperfect input from real users.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'software-dev-course-5',
        courseName: 'Developing Front-End Apps with React',
        programSlug: 'software-developer-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'software-dev-course-5-cp-1',
            courseSlug: 'software-dev-course-5',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Update React state so the screen actually changes',
            onetSkills: ['Programming'],
            scenario:
              'In your React component, a counter is set up with const [count, setCount] = useState(0). A teammate wrote the click handler as count = count + 1, and the number on screen never changes.',
            question: 'What is the fix?',
            options: [
              { id: 'a', text: 'Call setCount(count + 1) so React knows to re-render' },
              { id: 'b', text: 'Refresh the page after every click' },
              { id: 'c', text: 'Use var instead of const' },
              { id: 'd', text: 'Move the counter into a global variable' },
            ],
            correctOptionId: 'a',
            explanation:
              'React only re-renders when state changes through its setter function. Assigning to the variable directly changes nothing on screen — a classic beginner React bug.',
            level: 'applied',
          },
          {
            id: 'software-dev-course-5-cp-2',
            courseSlug: 'software-dev-course-5',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Break a UI into reusable React components',
            onetSkills: ['Technology Design', 'Originality'],
            scenario:
              'Your app shows product cards — image, name, price — in six different places. The code for the card is copy-pasted six times, and a design change means editing all six.',
            question: 'What is the React way to fix this?',
            options: [
              { id: 'a', text: 'Keep the copies but edit faster' },
              { id: 'b', text: 'Create one ProductCard component that takes props, and reuse it everywhere' },
              { id: 'c', text: 'Put all six cards in one giant component' },
              { id: 'd', text: 'Switch the cards to plain HTML outside React' },
            ],
            correctOptionId: 'b',
            explanation:
              'Components exist to package reusable UI. One ProductCard with props means a design change happens in exactly one file.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'software-dev-course-6',
        courseName: 'Developing Back-End Apps with Node.js and Express',
        programSlug: 'software-developer-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'software-dev-course-6-cp-1',
            courseSlug: 'software-dev-course-6',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Design REST API endpoints with the right HTTP methods',
            onetSkills: ['Programming', 'Systems Analysis'],
            scenario:
              'You are building an Express API for a to-do app. The mobile team needs to fetch all tasks, create a task, and delete a task.',
            question: 'Which method mapping follows REST conventions?',
            options: [
              { id: 'a', text: 'GET /tasks to fetch, POST /tasks to create, DELETE /tasks/:id to delete' },
              { id: 'b', text: 'POST for everything — it is the most powerful method' },
              { id: 'c', text: 'GET /deleteTask?id=5 to delete tasks' },
              { id: 'd', text: 'One endpoint /doStuff that reads a mode parameter' },
            ],
            correctOptionId: 'a',
            explanation:
              'REST maps methods to intent: GET reads, POST creates, DELETE removes. Using GET to delete is dangerous — browsers and crawlers can trigger it accidentally.',
            level: 'applied',
          },
          {
            id: 'software-dev-course-6-cp-2',
            courseSlug: 'software-dev-course-6',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Return correct status codes and handle API errors',
            onetSkills: ['Programming', 'Systems Evaluation'],
            scenario:
              'The mobile team complains: when they request a task that does not exist, your Express API returns status 200 with an empty body, so their app shows a blank screen instead of a "not found" message.',
            question: 'What should the API do instead?',
            options: [
              { id: 'a', text: 'Keep returning 200 — it means the server did not crash' },
              { id: 'b', text: 'Return 404 with a JSON error message so clients can react properly' },
              { id: 'c', text: 'Return 500 for everything unusual' },
              { id: 'd', text: 'Crash so the mobile team notices' },
            ],
            correctOptionId: 'b',
            explanation:
              'Status codes are the API\'s contract: 404 tells the client the resource does not exist so it can show the right message. A misleading 200 hides the problem.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'software-dev-course-7',
        courseName: 'Django Application Development with SQL and Databases',
        programSlug: 'software-developer-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'software-dev-course-7-cp-1',
            courseSlug: 'software-dev-course-7',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Model related data with Django and a relational database',
            onetSkills: ['Database Management', 'Systems Analysis'],
            scenario:
              'In your Django app, each course can have many lessons, and every lesson belongs to exactly one course. You are defining the Lesson model.',
            question: 'How do you represent this relationship?',
            options: [
              { id: 'a', text: 'Add a ForeignKey from Lesson to Course' },
              { id: 'b', text: 'Copy all course fields into every lesson row' },
              { id: 'c', text: 'Store lesson titles as one comma-separated text field on Course' },
              { id: 'd', text: 'Keep lessons in a separate spreadsheet' },
            ],
            correctOptionId: 'a',
            explanation:
              'A many-to-one relationship is exactly what ForeignKey models: each lesson points to its course. Duplicating course data or cramming lists into one field breaks updates and queries.',
            level: 'applied',
          },
          {
            id: 'software-dev-course-7-cp-2',
            courseSlug: 'software-dev-course-7',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Protect a database app from SQL injection',
            onetSkills: ['Programming', 'Database Management'],
            scenario:
              'A code review finds this in your app: query = "SELECT * FROM users WHERE name = \'" + user_input + "\'". The reviewer flags it as a security risk.',
            question: 'Why is it risky, and what is the fix?',
            options: [
              { id: 'a', text: 'It is slow; add an index' },
              { id: 'b', text: 'Attackers can inject SQL through user_input; use parameterized queries or the ORM instead' },
              { id: 'c', text: 'String concatenation is fine if you trust your users' },
              { id: 'd', text: 'The risk is only the missing semicolon' },
            ],
            correctOptionId: 'b',
            explanation:
              'Building SQL by gluing in user input lets attackers run their own commands — SQL injection. Parameterized queries and ORM methods keep input as data, never as code.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'software-dev-course-8',
        courseName: 'Introduction to Containers w/ Docker, Kubernetes & OpenShift',
        programSlug: 'software-developer-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'software-dev-course-8-cp-1',
            courseSlug: 'software-dev-course-8',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Use containers to fix "works on my machine" problems',
            onetSkills: ['Operations Analysis', 'Technology Design'],
            scenario:
              'Your app runs fine on your laptop but crashes on the server because the server has different Python and library versions.',
            question: 'How do containers solve this?',
            options: [
              { id: 'a', text: 'They make the server faster so crashes matter less' },
              { id: 'b', text: 'A Docker image packages the app with its exact dependencies, so it runs the same everywhere' },
              { id: 'c', text: 'They automatically rewrite your code for the server' },
              { id: 'd', text: 'They email you when versions differ' },
            ],
            correctOptionId: 'b',
            explanation:
              'A container image bundles your code, runtime, and libraries into one portable unit. The environment travels with the app, so laptop and server behave identically.',
            level: 'applied',
          },
          {
            id: 'software-dev-course-8-cp-2',
            courseSlug: 'software-dev-course-8',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Use Kubernetes to keep an app available under failure',
            onetSkills: ['Operations Analysis', 'Programming'],
            scenario:
              'Your containerized API runs as a Kubernetes deployment with three replicas. One container crashes at 2 a.m. By morning, three healthy replicas are running and no one was paged.',
            question: 'What Kubernetes behavior made that happen?',
            options: [
              { id: 'a', text: 'Kubernetes detected the failed container and automatically started a replacement to match the desired replica count' },
              { id: 'b', text: 'A coworker secretly fixed it overnight' },
              { id: 'c', text: 'Containers cannot crash inside Kubernetes' },
              { id: 'd', text: 'The crashed container repaired its own code' },
            ],
            correctOptionId: 'a',
            explanation:
              'Kubernetes constantly compares actual state to desired state and self-heals — restarting or replacing failed containers to keep the declared replica count running.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'software-dev-course-9',
        courseName: 'Application Development using Microservices and Serverless',
        programSlug: 'software-developer-professional-certificate-ibm',
        checkpoints: [
          {
            id: 'software-dev-course-9-cp-1',
            courseSlug: 'software-dev-course-9',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Decide when microservices beat one big application',
            onetSkills: ['Systems Analysis', 'Systems Evaluation'],
            scenario:
              'Your company\'s shopping app is one big codebase. The payments part needs updates weekly, but every deploy requires testing and releasing the entire app, slowing everyone down.',
            question: 'How could microservices help here?',
            options: [
              { id: 'a', text: 'They would not — bigger codebases are always safer' },
              { id: 'b', text: 'Splitting payments into its own service lets that team deploy independently without releasing the whole app' },
              { id: 'c', text: 'Microservices remove the need for testing' },
              { id: 'd', text: 'Renaming the folders to "services" gives the same benefit' },
            ],
            correctOptionId: 'b',
            explanation:
              'Microservices let teams build and deploy parts of a system independently. The win is faster, smaller releases — not skipping testing.',
            level: 'job_ready',
          },
          {
            id: 'software-dev-course-9-cp-2',
            courseSlug: 'software-dev-course-9',
            programSlug: 'software-developer-professional-certificate-ibm',
            demonstratedSkill: 'Match serverless computing to the right workload',
            onetSkills: ['Systems Evaluation', 'Complex Problem Solving'],
            scenario:
              'Your team needs to resize user-uploaded photos. Uploads are rare — sometimes none for hours, sometimes a burst. Keeping a server running all day for this feels wasteful.',
            question: 'Why is a serverless function a good fit?',
            options: [
              { id: 'a', text: 'Serverless means the code runs without any computers' },
              { id: 'b', text: 'It runs only when an upload triggers it and you pay only for that compute time, scaling with the bursts' },
              { id: 'c', text: 'Serverless is required for all image work' },
              { id: 'd', text: 'It is a good fit because it never has cold starts' },
            ],
            correctOptionId: 'b',
            explanation:
              'Serverless functions are event-driven and billed per execution — perfect for spiky, occasional workloads. Servers still exist; you just do not manage or pay for idle ones.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // CYBERSECURITY (Google)
  // ==========================================================================
  {
    programSlug: 'cybersecurity-professional-certificate-google',
    programTitle: 'Cybersecurity Professional Certificate',
    whyItMatters:
      'These checkpoints prove you can think and act like a security analyst when real threats show up.',
    courses: [
      {
        courseSlug: 'cybersecurity-course-1',
        courseName: 'Foundations of Cybersecurity',
        programSlug: 'cybersecurity-professional-certificate-google',
        checkpoints: [
          {
            id: 'cybersecurity-course-1-cp-1',
            courseSlug: 'cybersecurity-course-1',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Apply the CIA triad to a real incident',
            onetSkills: ['Systems Evaluation'],
            scenario:
              'A hospital\'s patient records system goes down for six hours. No data was stolen or changed — staff simply could not access records during the outage.',
            question: 'Which part of the CIA triad was affected?',
            options: [
              { id: 'a', text: 'Confidentiality — secrets were exposed' },
              { id: 'b', text: 'Integrity — data was altered' },
              { id: 'c', text: 'Availability — authorized users could not access the data when needed' },
              { id: 'd', text: 'None — nothing was stolen, so security was fine' },
            ],
            correctOptionId: 'c',
            explanation:
              'Availability means data and systems are reachable when authorized users need them. An outage is a security issue even when nothing is stolen — especially in a hospital.',
            level: 'foundation',
          },
          {
            id: 'cybersecurity-course-1-cp-2',
            courseSlug: 'cybersecurity-course-1',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Recognize social engineering before it works',
            onetSkills: ['Judgment and Decision Making'],
            scenario:
              'A caller says they are from IT, sounds urgent, and asks for your password to "fix your account before payroll runs." Your real IT team has never asked for passwords.',
            question: 'What do you do?',
            options: [
              { id: 'a', text: 'Give the password — payroll is important' },
              { id: 'b', text: 'Refuse, hang up, and report the call through your company\'s official channel' },
              { id: 'c', text: 'Give an old password as a compromise' },
              { id: 'd', text: 'Ask them to call back later' },
            ],
            correctOptionId: 'b',
            explanation:
              'Urgency plus a password request is classic social engineering. Legitimate IT never needs your password, and reporting helps protect coworkers who get the same call.',
            level: 'foundation',
          },
        ],
      },
      {
        courseSlug: 'cybersecurity-course-2',
        courseName: 'Play It Safe: Manage Security Risks',
        programSlug: 'cybersecurity-professional-certificate-google',
        checkpoints: [
          {
            id: 'cybersecurity-course-2-cp-1',
            courseSlug: 'cybersecurity-course-2',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Prioritize security risks by impact and likelihood',
            onetSkills: ['Systems Evaluation', 'Management of Material Resources'],
            scenario:
              'Your risk review finds two issues: the customer database has no backups, and the breakroom TV still has a default password. You can only fix one this week.',
            question: 'Which do you fix first, and why?',
            options: [
              { id: 'a', text: 'The TV — default passwords are embarrassing' },
              { id: 'b', text: 'The database backups — losing customer data would badly damage the business, the TV risk is minor' },
              { id: 'c', text: 'Neither — wait for the yearly audit' },
              { id: 'd', text: 'Whichever ticket was filed first' },
            ],
            correctOptionId: 'b',
            explanation:
              'Risk management ranks issues by likelihood and business impact. An unrecoverable customer database is a high-impact risk; the TV is low impact and can wait.',
            level: 'applied',
          },
          {
            id: 'cybersecurity-course-2-cp-2',
            courseSlug: 'cybersecurity-course-2',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Use security frameworks like NIST to guide decisions',
            onetSkills: ['Systems Evaluation'],
            scenario:
              'Your small company has no security plan. Leadership asks you to build one but does not want to invent everything from scratch.',
            question: 'What is the professional starting point?',
            options: [
              { id: 'a', text: 'Adopt an established framework like the NIST Cybersecurity Framework and adapt it to the company' },
              { id: 'b', text: 'Copy a random policy found on a forum' },
              { id: 'c', text: 'Buy every security product on the market first' },
              { id: 'd', text: 'Wait until after the first breach to see what matters' },
            ],
            correctOptionId: 'a',
            explanation:
              'Frameworks like NIST CSF distill industry experience into core functions (Identify, Protect, Detect, Respond, Recover), giving you a proven structure to adapt instead of guessing.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'cybersecurity-course-3',
        courseName: 'Connect and Protect: Networks and Network Security',
        programSlug: 'cybersecurity-professional-certificate-google',
        checkpoints: [
          {
            id: 'cybersecurity-course-3-cp-1',
            courseSlug: 'cybersecurity-course-3',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Use a firewall to control network traffic',
            onetSkills: ['Technology Design', 'Operations Analysis'],
            scenario:
              'Logs show a computer outside your company repeatedly trying to connect to an internal server on a port your business never uses.',
            question: 'What is the right protective step?',
            options: [
              { id: 'a', text: 'Unplug the internal server permanently' },
              { id: 'b', text: 'Add a firewall rule blocking that traffic, then keep monitoring the logs' },
              { id: 'c', text: 'Ignore it — outside computers cannot do harm' },
              { id: 'd', text: 'Connect back to the outside computer to investigate it yourself' },
            ],
            correctOptionId: 'b',
            explanation:
              'Firewalls exist to block unwanted traffic by rule. Blocking plus continued monitoring protects the server without taking down business systems — and "hacking back" is off-limits.',
            level: 'applied',
          },
          {
            id: 'cybersecurity-course-3-cp-2',
            courseSlug: 'cybersecurity-course-3',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Recognize a denial-of-service attack from network symptoms',
            onetSkills: ['Troubleshooting', 'Operations Analysis'],
            scenario:
              'Your company website suddenly becomes unreachable. Monitoring shows a massive flood of traffic from thousands of different IP addresses, far beyond normal volume.',
            question: 'What kind of attack does this look like?',
            options: [
              { id: 'a', text: 'A phishing attack' },
              { id: 'b', text: 'A distributed denial-of-service (DDoS) attack overwhelming the server' },
              { id: 'c', text: 'A password brute-force on one user account' },
              { id: 'd', text: 'Normal growth — popularity always looks like this' },
            ],
            correctOptionId: 'b',
            explanation:
              'A sudden traffic flood from many sources that knocks a service offline is the signature of DDoS. The "distributed" part is the thousands of different IPs.',
            level: 'applied',
          },
        ],
      },
      {
        courseSlug: 'cybersecurity-course-4',
        courseName: 'Tools of the Trade: Linux and SQL',
        programSlug: 'cybersecurity-professional-certificate-google',
        checkpoints: [
          {
            id: 'cybersecurity-course-4-cp-1',
            courseSlug: 'cybersecurity-course-4',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Investigate logs from the Linux command line',
            onetSkills: ['Operations Analysis', 'Programming'],
            scenario:
              'You suspect failed login attempts on a Linux server. The evidence is inside a large log file called auth.log, and you only care about lines mentioning "Failed password".',
            question: 'Which command shows just those lines?',
            options: [
              { id: 'a', text: 'rm auth.log' },
              { id: 'b', text: 'grep "Failed password" auth.log' },
              { id: 'c', text: 'cd auth.log' },
              { id: 'd', text: 'mkdir auth.log' },
            ],
            correctOptionId: 'b',
            explanation:
              'grep searches a file and prints matching lines — the everyday tool for log investigation. rm deletes the evidence, and cd/mkdir are for directories.',
            level: 'applied',
          },
          {
            id: 'cybersecurity-course-4-cp-2',
            courseSlug: 'cybersecurity-course-4',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Query security data with SQL filters',
            onetSkills: ['Programming', 'Operations Analysis'],
            scenario:
              'A login_attempts table has columns username, success, and country. Your lead asks for all failed logins that came from outside the US.',
            question: 'Which query is correct?',
            options: [
              { id: 'a', text: "SELECT * FROM login_attempts WHERE success = FALSE AND country != 'US';" },
              { id: 'b', text: "SELECT * FROM login_attempts WHERE success = FALSE OR country != 'US';" },
              { id: 'c', text: 'SELECT * FROM login_attempts;' },
              { id: 'd', text: "SELECT country FROM login_attempts WHERE username = 'US';" },
            ],
            correctOptionId: 'a',
            explanation:
              'Both conditions must be true for each row, which calls for AND. OR would also return successful foreign logins and failed US logins — far more rows than asked for.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'cybersecurity-course-5',
        courseName: 'Assets, Threats, and Vulnerabilities',
        programSlug: 'cybersecurity-professional-certificate-google',
        checkpoints: [
          {
            id: 'cybersecurity-course-5-cp-1',
            courseSlug: 'cybersecurity-course-5',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Triage a reported phishing email',
            onetSkills: ['Critical Thinking', 'Systems Analysis'],
            scenario:
              'An employee forwards you a suspicious email: it claims to be from the CEO, asks for urgent gift card purchases, and the sender address is ceo@yourcompany-payments.net instead of your real domain.',
            question: 'What do you do first?',
            options: [
              { id: 'a', text: 'Reply to the sender asking if they are really the CEO' },
              { id: 'b', text: 'Confirm the indicators (spoofed domain, urgency, unusual request), report it per procedure, and warn employees not to act on it' },
              { id: 'c', text: 'Buy the gift cards in case it is real' },
              { id: 'd', text: 'Delete the email and move on without telling anyone' },
            ],
            correctOptionId: 'b',
            explanation:
              'Look-alike domains, urgency, and money requests are classic phishing indicators. Triage means confirming, reporting through the proper channel, and containing the risk — others likely got the same email.',
            level: 'applied',
          },
          {
            id: 'cybersecurity-course-5-cp-2',
            courseSlug: 'cybersecurity-course-5',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Prioritize vulnerabilities from a scan report',
            onetSkills: ['Systems Analysis', 'Systems Evaluation'],
            scenario:
              'A vulnerability scan returns 200 findings. One is a critical flaw on the internet-facing payment server with a known exploit. Most others are low-severity issues on internal test machines.',
            question: 'How do you prioritize?',
            options: [
              { id: 'a', text: 'Fix findings in the order the report lists them' },
              { id: 'b', text: 'Patch the critical, exploitable, internet-facing flaw first — highest severity and exposure on a key asset' },
              { id: 'c', text: 'Fix all the easy low-severity ones first to shrink the count' },
              { id: 'd', text: 'Rerun the scan and hope for fewer findings' },
            ],
            correctOptionId: 'b',
            explanation:
              'Prioritize by severity, exploitability, exposure, and asset value. A known-exploit flaw on a public payment server beats hundreds of low-risk internal findings.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'cybersecurity-course-6',
        courseName: 'Sound the Alarm: Detection and Response',
        programSlug: 'cybersecurity-professional-certificate-google',
        checkpoints: [
          {
            id: 'cybersecurity-course-6-cp-1',
            courseSlug: 'cybersecurity-course-6',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Investigate a SIEM alert before acting',
            onetSkills: ['Operations Analysis', 'Troubleshooting'],
            scenario:
              'Your SIEM raises an alert: a user account logged in from two countries within ten minutes. The user is a sales rep who travels often.',
            question: 'What is the right analyst response?',
            options: [
              { id: 'a', text: 'Close the alert — travelers trigger these all the time' },
              { id: 'b', text: 'Investigate: check the login sources, device details, and recent account activity, and verify with the user before deciding' },
              { id: 'c', text: 'Immediately delete the user\'s account' },
              { id: 'd', text: 'Forward the alert to the whole company' },
            ],
            correctOptionId: 'b',
            explanation:
              'Impossible-travel alerts need investigation, not assumptions. Dismissing it could miss a compromise; deleting the account punishes a possibly innocent user. Evidence first, action second.',
            level: 'applied',
          },
          {
            id: 'cybersecurity-course-6-cp-2',
            courseSlug: 'cybersecurity-course-6',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Contain an active security incident in the right order',
            onetSkills: ['Troubleshooting', 'Quality Control Analysis'],
            scenario:
              'You confirm ransomware is actively encrypting files on one office workstation that is connected to the company network.',
            question: 'Following incident response steps, what comes first?',
            options: [
              { id: 'a', text: 'Contain it — isolate the machine from the network to stop the spread' },
              { id: 'b', text: 'Write the final incident report' },
              { id: 'c', text: 'Wipe the machine immediately, destroying all evidence' },
              { id: 'd', text: 'Pay the ransom right away' },
            ],
            correctOptionId: 'a',
            explanation:
              'After detection comes containment: isolating the machine stops the damage from spreading while preserving evidence for investigation. Reports come later; wiping first destroys what forensics needs.',
            level: 'job_ready',
          },
        ],
      },
      {
        courseSlug: 'cybersecurity-course-7',
        courseName: 'Automate Cybersecurity Tasks with Python',
        programSlug: 'cybersecurity-professional-certificate-google',
        checkpoints: [
          {
            id: 'cybersecurity-course-7-cp-1',
            courseSlug: 'cybersecurity-course-7',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Automate a repetitive security check with Python',
            onetSkills: ['Programming'],
            scenario:
              'Every morning you manually scan a long login log for a list of 20 flagged usernames. It takes an hour and you sometimes miss one.',
            question: 'How can Python help?',
            options: [
              { id: 'a', text: 'Write a script that reads the log, checks each line against the flagged list, and reports matches automatically' },
              { id: 'b', text: 'Use Python to type faster while you read manually' },
              { id: 'c', text: 'It cannot — log review must be done by eye' },
              { id: 'd', text: 'Delete the log so there is nothing to check' },
            ],
            correctOptionId: 'a',
            explanation:
              'Repetitive, rule-based checks are exactly what scripts do best: faster, every day, with no missed lines. Automation frees analysts for judgment work.',
            level: 'applied',
          },
          {
            id: 'cybersecurity-course-7-cp-2',
            courseSlug: 'cybersecurity-course-7',
            programSlug: 'cybersecurity-professional-certificate-google',
            demonstratedSkill: 'Parse security data out of text with Python',
            onetSkills: ['Programming', 'Technology Design'],
            scenario:
              'Each line of a log looks like: "2026-06-11 08:32:10 LOGIN username=jsmith ip=203.0.113.7 status=failed". You need to pull out the IP address from thousands of lines.',
            question: 'Which Python approach fits?',
            options: [
              { id: 'a', text: 'Read each IP and retype it into a spreadsheet' },
              { id: 'b', text: 'Use string splitting or a regular expression to extract the value after "ip=" on every line' },
              { id: 'c', text: 'Print every full line and highlight IPs with a marker' },
              { id: 'd', text: 'Sort the file alphabetically first — IPs then extract themselves' },
            ],
            correctOptionId: 'b',
            explanation:
              'Logs follow patterns, and string methods or regex pull structured values like "ip=" fields out of them reliably at any scale. This is everyday security scripting.',
            level: 'job_ready',
          },
        ],
      },
    ],
  },
];
