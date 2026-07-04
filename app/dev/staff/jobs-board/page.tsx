import { notFound } from 'next/navigation';
import { JobsBoardKit, type JobRow } from '@/components/portal/kit/pages/admin-subviews/JobsBoardKit';

/**
 * Showcase-only render of the admin Jobs board with inline mock data —
 * no auth/DB, so screenshot tooling can photograph the kit component directly.
 */
export const dynamic = 'force-dynamic';

const JOBS: JobRow[] = [
  {
    id: 'sf-admin',
    role: 'Salesforce Administrator',
    employer: 'Deloitte',
    location: 'Austin, TX',
    wage: '$72–88k',
    applicants: 14,
    status: 'Open',
  },
  {
    id: 'it-support',
    role: 'IT Support Specialist',
    employer: 'Dell Technologies',
    location: 'Round Rock, TX',
    wage: '$58–70k',
    applicants: 9,
    status: 'Open',
  },
  {
    id: 'med-assistant',
    role: 'Medical Assistant',
    employer: "St. David's HealthCare",
    location: 'Austin, TX',
    wage: '$44–52k',
    applicants: 22,
    status: 'Closing',
  },
  {
    id: 'warehouse-assoc',
    role: 'Warehouse Associate',
    employer: 'HEB Distribution',
    location: 'Pflugerville, TX',
    wage: '$40–46k',
    applicants: 31,
    status: 'Filled',
  },
  {
    id: 'field-tech',
    role: 'Field Service Technician',
    employer: 'Austin Energy',
    location: 'Austin, TX',
    wage: '$50–60k',
    applicants: 6,
    status: 'Pending',
  },
  {
    id: 'agentforce-eng',
    role: 'Agentforce Solutions Engineer',
    employer: 'Accenture',
    location: 'Remote',
    wage: '$74–92k',
    applicants: 3,
    status: 'Draft',
  },
  {
    id: 'facilities-coord',
    role: 'Facilities Coordinator',
    employer: 'City of Austin',
    location: 'Austin, TX',
    wage: '$42–48k',
    applicants: 11,
    status: 'Closed',
  },
];

export default function DevStaffJobsBoardPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return <JobsBoardKit jobs={JOBS} openRoles={127} employers={48} />;
}
