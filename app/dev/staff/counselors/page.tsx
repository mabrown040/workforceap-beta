import { notFound } from 'next/navigation';
import {
  CounselorsRosterKit,
  type CounselorRow,
} from '@/components/portal/kit/pages/admin-subviews/CounselorsRosterKit';

/**
 * Showcase-only render of the admin Counselors roster with inline mock data —
 * no auth/DB, so screenshot tooling can photograph the kit component directly.
 */
export const dynamic = 'force-dynamic';

const COUNSELORS: CounselorRow[] = [
  {
    id: 'cn1',
    name: 'Renata Alves',
    initials: 'RA',
    caption: 'WorkforceAP · Career Coach',
    caseload: 38,
    atRisk: 4,
    placements: 21,
    avgResponse: '2.1h',
    load: 'Balanced',
  },
  {
    id: 'cn2',
    name: 'Devon Whitfield',
    initials: 'DW',
    caption: 'WorkforceAP · Senior Career Coach',
    caseload: 52,
    atRisk: 9,
    placements: 33,
    avgResponse: '3.6h',
    load: 'Over',
  },
  {
    id: 'cn3',
    name: 'Mei-Ling Zhou',
    initials: 'MZ',
    caption: 'WorkforceAP · Career Coach',
    caseload: 29,
    atRisk: 2,
    placements: 18,
    avgResponse: '1.4h',
    load: 'Light',
  },
  {
    id: 'cn4',
    name: 'Samuel Okonkwo',
    initials: 'SO',
    caption: 'WorkforceAP · Career Coach',
    caseload: 41,
    atRisk: 5,
    placements: 27,
    avgResponse: '2.8h',
    load: 'Balanced',
  },
  {
    id: 'cn5',
    name: 'Isabela Cortez',
    initials: 'IC',
    caption: 'WorkforceAP · Career Coach',
    caseload: 33,
    atRisk: 1,
    placements: 24,
    avgResponse: '1.9h',
    load: 'Light',
  },
];

export default function DevStaffCounselorsPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <CounselorsRosterKit
      counselors={COUNSELORS}
      total={5}
      avgCaseload={39}
      atRiskOwned={21}
      avgResponse="2.4h"
    />
  );
}
