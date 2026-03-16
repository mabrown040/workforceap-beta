export type CertItem = {
  name: string;
  cost: string;
  timeToComplete: string;
  link: string;
};

export type CertTrack = {
  id: string;
  name: string;
  certs: CertItem[];
};

export const CERTIFICATION_TRACKS: CertTrack[] = [
  {
    id: 'it-support',
    name: 'IT Support',
    certs: [
      { name: 'CompTIA A+', cost: '~$250', timeToComplete: '3–6 months', link: 'https://www.comptia.org/certifications/a' },
      { name: 'CompTIA Network+', cost: '~$350', timeToComplete: '2–4 months', link: 'https://www.comptia.org/certifications/network' },
      { name: 'CompTIA Security+', cost: '~$400', timeToComplete: '2–4 months', link: 'https://www.comptia.org/certifications/security' },
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    certs: [
      { name: 'CNA Certification', cost: 'Varies by state', timeToComplete: '4–12 weeks', link: 'https://www.nursingworld.org/certification/' },
      { name: 'CPR/First Aid', cost: '~$50–100', timeToComplete: '1 day', link: 'https://www.redcross.org/take-a-class' },
      { name: 'Medical Assistant Certificate', cost: '~$1,000–3,000', timeToComplete: '9–12 months', link: 'https://www.aama-ntl.org/' },
    ],
  },
  {
    id: 'trades',
    name: 'Trades',
    certs: [
      { name: 'OSHA 10', cost: '~$60–80', timeToComplete: '10 hours', link: 'https://www.osha.gov/training' },
      { name: 'OSHA 30', cost: '~$150–200', timeToComplete: '30 hours', link: 'https://www.osha.gov/training' },
      { name: 'Trade-specific certification', cost: 'Varies', timeToComplete: 'Varies', link: 'https://www.nccer.org/' },
    ],
  },
];
