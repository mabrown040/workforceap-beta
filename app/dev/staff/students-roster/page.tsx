import { notFound } from 'next/navigation';
import {
  StudentsRosterKit,
  type StudentRow,
  type StudentStatus,
} from '@/components/portal/kit/pages/admin-subviews/StudentsRosterKit';

/**
 * Showcase-only render of the admin Students roster — no auth/DB, so screenshot
 * tooling can photograph sorted column headers directly.
 */
export const dynamic = 'force-dynamic';

const PROGRAMS = [
  'IT Support Professional Certificate (IBM)',
  'Google Cybersecurity Professional Certificate',
  'Data Analytics Professional Certificate',
  'AWS Cloud Solutions Architect Professional Certificate',
] as const;

const STATUSES: StudentStatus[] = [
  'Job-Ready',
  'At Risk',
  'In Training',
  'Interviewing',
  'Placed',
];

const STUDENTS: StudentRow[] = Array.from({ length: 132 }, (_, index) => {
  const name = [
    'Michael Brown',
    'Jasmine Davis',
    'Carlos Torres',
    'Aisha Williams',
    'Noel Gonzalez',
    'Joseph David Ring',
  ][index % 6];
  const unmatched = index === 131;
  return {
    id: unmatched ? 'coursera:demo@example.com' : `member-${index}`,
    name: unmatched ? 'Demo Coursera' : name,
    email: unmatched
      ? 'demo.coursera@example.test'
      : `${name.toLowerCase().replace(/\s+/g, '.')}.${index}@example.test`,
    initials: name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    location: index % 3 === 0 ? 'Round Rock, TX' : 'Austin, TX',
    program: unmatched ? 'Coursera activity' : PROGRAMS[index % PROGRAMS.length],
    progress: (index * 13) % 101,
    readiness: 35 + ((index * 11) % 66),
    counselor: ['S. Chen', 'R. Patel', 'Unassigned'][index % 3],
    status: STATUSES[index % STATUSES.length],
    lastActive: index % 4 === 0 ? '16d ago' : index % 2 === 0 ? '2h ago' : '1d ago',
    lastActiveAt: Date.now() - index * 86_400_000,
    courseraGrade: index % 7 === 0 ? null : 68 + (index % 30),
    inWap: !unmatched,
    noProgram: !unmatched && index % 9 === 0,
    href: unmatched ? '/admin/coursera/learners/unmatched/demo' : `/admin/members/member-${index}`,
  };
});

export default function DevStaffStudentsRosterPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return <StudentsRosterKit students={STUDENTS} total={847} />;
}
