import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DesignSurface } from '@/components/portal/kit';
import { InvitesKit } from '@/components/portal/kit/pages/admin-subviews/InvitesKit';
import { UsersKit } from '@/components/portal/kit/pages/admin-subviews/UsersKit';
import { BlogKit } from '@/components/portal/kit/pages/admin-subviews/BlogKit';
import { CounselorsRosterKit } from '@/components/portal/kit/pages/admin-subviews/CounselorsRosterKit';
import { StudentsRosterKit } from '@/components/portal/kit/pages/admin-subviews/StudentsRosterKit';

/**
 * Showcase-only render of the dense staff rosters in their EMPTY state — the
 * case a seeded database almost never shows, and the one where a staff surface
 * most easily becomes a dead end.
 *
 * Each table below has zero rows, so what is on screen is exactly the empty
 * state: what the area is, why it is empty, and the single next action. Sits
 * next to the populated proofs (/dev/staff/counselors, /dev/staff/placements,
 * …) so both halves of the same component can be reviewed without auth or DB.
 */
export const dynamic = 'force-dynamic';

function Divider({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '20px 24px 0',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--wa-muted)',
      }}
    >
      {label}
    </div>
  );
}

export default function DevStaffEmptyStatesPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <DesignSurface surface="dense">
      <Divider label="Invites — empty" />
      <InvitesKit
        invites={[]}
        sent={0}
        accepted={0}
        pending={0}
        rate={0}
        emptyAction={
          <Link href="/admin/invites/new" className="btn btn-primary">
            Send your first invite
          </Link>
        }
      />

      <Divider label="Users — empty" />
      <UsersKit users={[]} total={0} />

      <Divider label="Blog — empty" />
      <BlogKit posts={[]} />

      <Divider label="Counselors — empty" />
      <CounselorsRosterKit
        counselors={[]}
        total={0}
        avgCaseload={0}
        atRiskOwned={0}
        avgResponse="—"
      />

      <Divider label="Students — roster genuinely empty" />
      <StudentsRosterKit students={[]} total={0} />
    </DesignSurface>
  );
}
