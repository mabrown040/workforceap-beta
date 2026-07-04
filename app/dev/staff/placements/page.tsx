import { notFound } from 'next/navigation';
import { PlacementsKit, type PlacementRow } from '@/components/portal/kit/pages/admin-subviews/PlacementsKit';

/**
 * Showcase-only render of the admin Placements roster with inline mock data —
 * no auth/DB, so screenshot tooling can photograph the kit component directly.
 */
export const dynamic = 'force-static';

const PLACEMENTS: PlacementRow[] = [
  {
    id: 'p1',
    memberId: 'm1',
    student: 'Jasmine Okafor',
    employer: 'Dell Technologies',
    role: 'IT Support Specialist',
    wage: '$61k',
    survey: 'Done',
    status: 'Confirmed',
  },
  {
    id: 'p2',
    memberId: 'm2',
    student: 'Diego Villareal',
    employer: 'Austin Energy',
    role: 'Field Service Technician',
    wage: '$54k',
    survey: 'Pending',
    status: 'Confirmed',
  },
  {
    id: 'p3',
    memberId: 'm3',
    student: "Grace O'Sullivan",
    employer: "St. David's HealthCare",
    role: 'Medical Assistant',
    wage: '$47k',
    survey: 'Done',
    status: 'Confirmed',
  },
  {
    id: 'p4',
    memberId: 'm4',
    student: 'Tobias Nwosu',
    employer: 'HEB Distribution',
    role: 'Warehouse Associate',
    wage: '$42k',
    survey: 'Pending',
    status: 'Pending',
  },
  {
    id: 'p5',
    memberId: 'm5',
    student: 'Linh Pham',
    employer: 'Accenture',
    role: 'Agentforce Solutions Engineer',
    wage: '$78k',
    survey: 'Done',
    status: 'Confirmed',
  },
  {
    id: 'p6',
    memberId: 'm6',
    student: 'Malik Henderson',
    employer: 'Deloitte',
    role: 'Salesforce Administrator',
    wage: '$72k',
    survey: 'Pending',
    status: 'Confirmed',
  },
  {
    id: 'p7',
    memberId: 'm7',
    student: 'Esperanza Cruz',
    employer: 'City of Austin',
    role: 'Facilities Coordinator',
    wage: '$45k',
    survey: 'Done',
    status: 'Pending',
  },
];

export default function DevStaffPlacementsPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <PlacementsKit
      placements={PLACEMENTS}
      ytd={213}
      avgWage="$58k"
      retention90d="78.4%"
      toConfirm={2}
      total={213}
    />
  );
}
