// PLACEHOLDER — replace before any paid acquisition push.
//
// These testimonials are NOT real WorkforceAP member stories. They exist so
// engineering can build and review trust/social-proof UI in isolation while
// the content team gathers real, consented quotes. Every entry's `id` is
// prefixed with `placeholder-` so a future audit script can detect and
// remove them before launch.

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role?: string;
  program?: string;
  salaryBefore?: string;
  salaryAfter?: string;
  avatarUrl?: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'placeholder-it-support-marcus',
    quote:
      'I went from working overnight retail to a help desk job with benefits in under six months. My counselor checked in every week — that accountability is what got me across the finish line.',
    name: 'Marcus Reyes',
    role: 'IT Support Specialist',
    program: 'IT Support',
    salaryBefore: '$32K',
    salaryAfter: '$58K',
  },
  {
    id: 'placeholder-comptia-tasha',
    quote:
      'CompTIA felt out of reach until WorkforceAP covered the exam and gave me a study plan I could actually follow around my kids schedule. Passed A+ on the first try.',
    name: 'Tasha Williams',
    role: 'Junior Systems Technician',
    program: 'CompTIA A+',
    salaryBefore: '$28K',
    salaryAfter: '$52K',
  },
  {
    id: 'placeholder-aws-cloud-diego',
    quote:
      'I had zero tech background. Twelve weeks later I had an AWS cert and an interview pipeline. The resume coaching alone was worth it.',
    name: 'Diego Patel',
    role: 'Cloud Operations Associate',
    program: 'AWS Cloud Practitioner',
    salaryBefore: '$35K',
    salaryAfter: '$72K',
  },
  {
    id: 'placeholder-data-analytics-amara',
    quote:
      'The data analytics track was structured but flexible enough for a working parent. I now run reporting for a regional healthcare network.',
    name: 'Amara Johnson',
    role: 'Data Analyst',
    program: 'Data Analytics',
    salaryBefore: '$38K',
    salaryAfter: '$67K',
  },
  {
    id: 'placeholder-cybersecurity-lin',
    quote:
      'I was nervous about switching careers in my forties. WorkforceAP matched me with a counselor who got it, and the cybersecurity curriculum was current — not 2015 material recycled.',
    name: 'Lin Tran',
    role: 'SOC Analyst I',
    program: 'Cybersecurity',
    salaryBefore: '$41K',
    salaryAfter: '$74K',
  },
];
