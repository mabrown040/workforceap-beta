/**
 * Workforce AP Digital Literacy Course — the DigitalLearn.org pathway.
 *
 * Ops (9/3/26) replaced the Microsoft Digital Literacy link with a class built
 * from DigitalLearn.org (Public Library Association): free, online, self-paced,
 * English and Spanish, printable certificate of completion per course, well
 * under 25 hours in total. Members open each module inside the WorkforceAP
 * portal (`/dashboard/learning/modules/...`), watch the linked DigitalLearn
 * lessons, then mark the module complete.
 *
 * Dependency-free so both the Next portal and the Astro marketing build read
 * the same sequence. Module order, names, and minutes come from the recommended
 * course sequence supplied by the Executive Director.
 */

export const DIGITAL_LITERACY_PROGRAM_SLUG = 'digital-literacy-empowerment-class';
export const DIGITAL_LITERACY_PROGRAM_TITLE = 'Workforce AP Digital Literacy Course';
export const DIGITALLEARN_HOME_URL = 'https://www.digitallearn.org/';
export const DIGITALLEARN_COURSES_URL = 'https://www.digitallearn.org/courses';
export const DIGITALLEARN_PROVIDER_NAME = 'DigitalLearn.org';

export interface DigitalLiteracyLesson {
  title: string;
  minutes: number;
  /** DigitalLearn.org course page that carries this lesson's video(s). */
  url: string;
}

export interface DigitalLiteracyModule {
  /** Stable key; also used as the module's course slug suffix. */
  key: string;
  name: string;
  /** One-sentence member-facing summary. */
  summary: string;
  lessons: DigitalLiteracyLesson[];
  /** What the member practises in this module (from the recommended sequence). */
  topics: string[];
}

const course = (slug: string) => `https://www.digitallearn.org/courses/${slug}`;

export const DIGITAL_LITERACY_MODULES: readonly DigitalLiteracyModule[] = [
  {
    key: 'computer-basics',
    name: 'Computer Basics',
    summary: 'Get comfortable with a computer: the parts, the mouse and keyboard, the desktop, and the everyday moves — open, close, copy, paste, save, print.',
    lessons: [
      { title: 'Introduction', minutes: 1, url: course('getting-started-on-a-computer') },
      { title: 'What is a Computer', minutes: 3, url: course('getting-started-on-a-computer') },
      { title: 'Getting Started with a Computer', minutes: 21, url: course('getting-started-on-a-computer') },
    ],
    topics: [
      'What is a computer',
      'Getting started on a computer',
      'Computer components',
      'Mouse and keyboard use',
      'Desktop navigation',
      'Opening and closing programs',
      'Copy, paste, save and print',
    ],
  },
  {
    key: 'file-management-basics',
    name: 'File Management Basics',
    summary: 'Keep your digital information organised: create, name, move, find, and delete files and folders, and start your first documents.',
    lessons: [
      { title: 'Files and Folders', minutes: 3, url: course('getting-started-on-a-computer') },
      { title: 'Saving and Closing', minutes: 3, url: course('getting-started-on-a-computer') },
      { title: 'Deleting Files', minutes: 3, url: course('getting-started-on-a-computer') },
      { title: 'Introduction: How to Begin to Create Documents', minutes: 4, url: course('creating-documents') },
      { title: 'Add a Picture', minutes: 1, url: course('creating-documents') },
    ],
    topics: [
      'Creating files and folders',
      'Naming, moving and deleting files',
      'Locating saved documents',
      'Uploading and downloading files',
      'Organizing digital information',
    ],
  },
  {
    key: 'internet-basics',
    name: 'Internet Basics',
    summary: 'Get online with confidence: browsers, moving around a website, searching well, and judging what you find.',
    lessons: [
      { title: 'Search Engines', minutes: 1, url: course('basic-search') },
      { title: 'Basic Search', minutes: 7, url: course('basic-search') },
      { title: 'Navigating a Website', minutes: 6, url: course('navigating-a-website') },
    ],
    topics: [
      'Connecting to the internet',
      'Using web browsers',
      'Navigating websites',
      'Using search engines',
      'Evaluating online information',
    ],
  },
  {
    key: 'email-basics',
    name: 'Email Basics',
    summary: 'Set up and run an email account like a professional: write, reply, attach, organise, and spot suspicious messages.',
    lessons: [
      { title: 'Intro to Email', minutes: 15, url: course('intro-to-email') },
      { title: 'Intro to Email 2: Beyond the Basics', minutes: 28, url: course('intro-to-email-2-beyond-the-basics') },
    ],
    topics: [
      'Creating an email account',
      'Writing and sending messages',
      'Reply, Reply All, CC and BCC',
      'Sending attachments',
      'Opening and downloading attachments',
      'Organizing and deleting emails',
      'Recognizing suspicious messages',
    ],
  },
  {
    key: 'accounts-and-passwords',
    name: 'Accounts and Passwords',
    summary: 'Create online accounts safely, choose strong passwords, recover access, and turn on multi-factor authentication.',
    lessons: [{ title: 'Accounts and Passwords', minutes: 20, url: course('accounts-and-passwords') }],
    topics: [
      'Creating online accounts',
      'Developing secure passwords',
      'Password recovery',
      'Multi-factor authentication',
      'Protecting personal information',
    ],
  },
  {
    key: 'video-conferencing-basics',
    name: 'Video Conferencing Basics',
    summary: 'Join and host video meetings with Zoom: camera, microphone, chat, screen sharing, and professional meeting habits.',
    lessons: [{ title: 'Video Conferencing', minutes: 21, url: course('video-conferencing') }],
    topics: [
      'Setting up and using Zoom',
      'Joining and hosting meetings',
      'Camera and microphone controls',
      'Chat and screen-sharing functions',
      'Professional video-meeting practices',
    ],
  },
  {
    key: 'cybersecurity-basics',
    name: 'Cybersecurity Basics: Online Scams and Fraud',
    summary: 'Recognise phishing and scams, avoid malware and unsafe downloads, browse safely, and protect your devices and privacy.',
    lessons: [{ title: 'Online Scams and Fraud', minutes: 28, url: course('online-scams') }],
    topics: [
      'Phishing and online scams',
      'Malware and unsafe downloads',
      'Safe browsing',
      'Internet privacy',
      'Protecting devices and personal information',
    ],
  },
  {
    key: 'cloud-storage',
    name: 'Cloud Storage',
    summary: 'Save files online, upload and download documents, share them, manage who has access, and collaborate.',
    lessons: [{ title: 'Cloud Storage', minutes: 22, url: course('cloud-storage') }],
    topics: [
      'Saving files online',
      'Uploading and downloading documents',
      'Sharing files',
      'Managing access permissions',
      'Collaborating online',
    ],
  },
  {
    key: 'microsoft-word-basics',
    name: 'Microsoft Word Basics',
    summary: 'Create and edit documents in Word: format text, then save, download, and print.',
    lessons: [{ title: 'Microsoft Word', minutes: 17, url: course('microsoft-word') }],
    topics: ['Creating and editing documents', 'Formatting text', 'Saving, downloading and printing documents'],
  },
  {
    key: 'online-job-searching',
    name: 'Online Job Searching and Applications',
    summary: 'Search for jobs online, create and upload a résumé, complete online applications, and communicate professionally with employers.',
    lessons: [{ title: 'Online Job Searching', minutes: 22, url: course('online-job-searching') }],
    topics: [
      'Searching for employment',
      'Creating and uploading résumés',
      'Completing online applications',
      'Communicating professionally with employers',
    ],
  },
];

export function digitalLiteracyModuleMinutes(module: DigitalLiteracyModule): number {
  return module.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
}

export const DIGITAL_LITERACY_TOTAL_MINUTES = DIGITAL_LITERACY_MODULES.reduce(
  (sum, module) => sum + digitalLiteracyModuleMinutes(module),
  0,
);

/** Course hours for catalog rows; quarter-hour precision so both catalogs agree exactly. */
export function digitalLiteracyModuleHours(module: DigitalLiteracyModule): number {
  return Math.max(0.25, Math.round((digitalLiteracyModuleMinutes(module) / 60) * 4) / 4);
}

export const DIGITAL_LITERACY_DURATION_LABEL = `Online, self-paced — ${DIGITAL_LITERACY_MODULES.length} modules, about ${Math.round(DIGITAL_LITERACY_TOTAL_MINUTES / 60)} hours of lessons (DigitalLearn.org)`;

export const DIGITAL_LITERACY_DESCRIPTION =
  'This course is built for members who are new to computers, smartphones, or the internet — no prior tech experience needed. It follows the free DigitalLearn.org pathway from the Public Library Association: ten short modules you open inside your WorkforceAP portal, from computer basics and files through email, passwords, video meetings, online safety, cloud storage, Microsoft Word, and online job applications. Lessons are online and self-paced, available in English and Spanish, and each DigitalLearn course gives you a printable certificate of completion. Members who finish are ready for office support, customer service, and administrative roles. If you are already comfortable with email and basic software, Cybersecurity or IT Support may be a stronger next step. Not sure where you stand? The pathfinder quiz can help you choose.';

/** Catalog course shape shared by the Next and Astro program catalogs. */
export function digitalLiteracyCatalogCourses(programSlug: string = DIGITAL_LITERACY_PROGRAM_SLUG) {
  return DIGITAL_LITERACY_MODULES.map((module, index) => ({
    slug: `${programSlug}-course-${index + 1}`,
    name: module.name,
    estimatedHours: digitalLiteracyModuleHours(module),
    description: `${module.summary} Covers: ${module.topics.join('; ')}.`,
    kind: 'workforceap' as const,
    lessons: module.lessons,
    topics: module.topics,
    provider: { name: DIGITALLEARN_PROVIDER_NAME, url: DIGITALLEARN_COURSES_URL },
  }));
}
