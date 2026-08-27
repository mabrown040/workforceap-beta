import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  InvitesKit,
  type InviteRow,
} from '@/components/portal/kit/pages/admin-subviews/InvitesKit';

/**
 * Showcase-only render of the admin Invites cockpit with inline mock data —
 * no auth/DB, so screenshot tooling can photograph the kit component directly.
 *
 * The figures below encode the rule the real loader now applies: of six invites
 * still marked pending in the database, two are past their expiry, so the table
 * shows them as Expired and the Pending KPI reads 4 rather than 6. Sent stays
 * at the full 9 (4 pending + 2 expired-by-time + 2 accepted + 1 revoked).
 */
export const dynamic = 'force-dynamic';

const INVITES: InviteRow[] = [
  { id: 'i1', email: 'dana.reyes@example.org', type: 'Member', sent: '2h ago', status: 'pending' },
  { id: 'i2', email: 'k.oyelaran@example.org', type: 'Counselor', sent: '6h ago', status: 'pending' },
  { id: 'i3', email: 'partner@capitalarea.example', type: 'Partner', sent: '1d ago', status: 'pending' },
  { id: 'i4', email: 'j.whitaker@example.org', type: 'Member', sent: '2d ago', status: 'pending' },
  // Still status='pending' in the database, but past expiresAt — the table and
  // the Pending KPI must agree that these read as Expired.
  { id: 'i5', email: 'lapsed.one@example.org', type: 'Member', sent: '31d ago', status: 'expired' },
  { id: 'i6', email: 'lapsed.two@example.org', type: 'Member', sent: '34d ago', status: 'expired' },
  { id: 'i7', email: 'm.alvarez@example.org', type: 'Member', sent: '5d ago', status: 'accepted' },
  { id: 'i8', email: 's.nakamura@example.org', type: 'Admin', sent: '8d ago', status: 'accepted' },
  { id: 'i9', email: 'revoked@example.org', type: 'Partner', sent: '12d ago', status: 'revoked' },
];

export default function DevStaffInvitesPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <InvitesKit
      invites={INVITES}
      sent={9}
      accepted={2}
      pending={4}
      rate={22}
      action={
        <Link href="/admin/invites/new" className="btn btn-primary">
          Send Invites
        </Link>
      }
      emptyAction={
        <Link href="/admin/invites/new" className="btn btn-primary">
          Send your first invite
        </Link>
      }
    />
  );
}
