import { notFound } from 'next/navigation';
import {
  StudentsRosterKit,
  type StudentRow,
} from '@/components/portal/kit/pages/admin-subviews/StudentsRosterKit';

/**
 * Showcase-only render of the admin Students roster with inline mock data —
 * no auth/DB, so screenshot tooling can photograph the kit component directly.
 *
 * The roster below deliberately contains nobody in the "Not in WAP" view, so
 * selecting that chip reaches the filtered-to-nothing empty state (distinct
 * from an empty roster) and its "Show all students" reset.
 */
export const dynamic = 'force-dynamic';

const STUDENTS: StudentRow[] = [
  {
    id: 's1',
    name: 'Jasmine Okafor',
    initials: 'JO',
    location: 'Austin, TX',
    program: 'Cloud & IT',
    progress: 92,
    readiness: 88,
    counselor: 'Renata Alves',
    status: 'Job-Ready',
    lastActive: '2h ago',
    courseraGrade: 94,
  },
  {
    id: 's2',
    name: 'Diego Villareal',
    initials: 'DV',
    location: 'Round Rock, TX',
    program: 'Skilled Trades',
    progress: 41,
    readiness: 37,
    counselor: 'Devon Whitfield',
    status: 'At Risk',
    lastActive: '16d ago',
    courseraGrade: 52,
  },
  {
    id: 's3',
    name: "Grace O'Sullivan",
    initials: 'GO',
    location: 'Austin, TX',
    program: 'Healthcare',
    progress: 78,
    readiness: 71,
    counselor: 'Mei-Ling Zhou',
    status: 'In Training',
    lastActive: '1d ago',
    courseraGrade: 81,
  },
  {
    id: 's4',
    name: 'Tobias Nwosu',
    initials: 'TN',
    location: 'Pflugerville, TX',
    program: 'Manufacturing',
    progress: 55,
    readiness: 49,
    counselor: 'Samuel Okonkwo',
    status: 'In Training',
    lastActive: '4h ago',
    courseraGrade: null,
  },
  {
    id: 's5',
    name: 'Linh Pham',
    initials: 'LP',
    location: 'Cedar Park, TX',
    program: 'Data & AI',
    progress: 88,
    readiness: 90,
    counselor: 'Isabela Cortez',
    status: 'Interviewing',
    lastActive: '30m ago',
    courseraGrade: 89,
  },
  {
    id: 's6',
    name: 'Marcus Bell',
    initials: 'MB',
    location: 'Austin, TX',
    program: 'Cloud & IT',
    progress: 100,
    readiness: 95,
    counselor: 'Renata Alves',
    status: 'Placed',
    lastActive: '3d ago',
    courseraGrade: 97,
  },
];

export default function DevStaffStudentsRosterPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return <StudentsRosterKit students={STUDENTS} total={STUDENTS.length} />;
}
