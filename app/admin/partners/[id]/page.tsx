import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramCompleted, memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';
import InvitePartnerUserButton from '@/components/admin/InvitePartnerUserButton';
import PartnerPayoutsPanel, { type PayoutRow } from '@/components/admin/PartnerPayoutsPanel';
import { getPartnerPlacementPayoutUsd } from '@/lib/partner/partnerPayout';
import { isPayoutEligibleType } from '@/lib/partner/partnerType';
import PartnerDetailActions from '@/components/admin/PartnerDetailActions';
import PageHeader from '@/components/portal/PageHeader';
import DataTable from '@/components/portal/ui/DataTable';

type Props = { params: Promise<{ id: string }> };

export default async function AdminPartnerDetailPage({ params }: Props) {
  const { id } = await params;
  const [partner, subgroups, allPartners] = await Promise.all([
    prisma.partner.findUnique({
      where: { id },
      include: {
      counselors: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
        where: { active: true },
      },
      referrals: {
        where: { member: { deletedAt: null } },
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              email: true,
              enrolledProgram: true,
              enrolledAt: true,
              assessmentCompleted: true,
              deletedAt: true,
              placementRecord: {
                select: { id: true, employerName: true, jobTitle: true, salaryOffered: true, placedAt: true, startDateVerified: true },
              },
              userCertifications: { select: { certName: true, earnedAt: true } },
              applications: { select: { status: true, submittedAt: true } },
              memberProgramProgress: {
                select: { programSlug: true, averagePercent: true, coursesCompleted: true },
              },
            },
          },
        },
        orderBy: { referredAt: 'desc' },
      },
      _count: { select: { counselors: true, referrals: true } },
    },
  }),
    prisma.subgroup.findMany({
      take: 5000,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, partnerId: true },
    }),
    prisma.partner.findMany({
      take: 5000,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, active: true },
    }),
  ]);

  if (!partner) notFound();

  const members = partner.referrals.map((r) => r.member);

  // Placement payout rows for the admin payout panel (mirrors the gates the
  // POST /api/partner/payout route re-checks server-side).
  const placedMembers = members.filter((m) => m.placementRecord);
  const placementIds = placedMembers.map((m) => m.placementRecord!.id);
  const paidEvents = placementIds.length
    ? await prisma.memberEvent.findMany({
        where: {
          eventName: 'PARTNER_PAYOUT_SENT',
          entityType: 'PlacementRecord',
          entityId: { in: placementIds },
        },
        select: { entityId: true },
      })
    : [];
  const paidPlacementIds = new Set(paidEvents.map((e) => e.entityId));
  const payoutRows: PayoutRow[] = placedMembers.map((m) => {
    const rec = m.placementRecord!;
    const paid = paidPlacementIds.has(rec.id);
    let blockedReason: string | null = null;
    if (!paid && (!rec.placedAt || !rec.startDateVerified)) {
      blockedReason = 'Needs verified start date';
    }
    return {
      placementId: rec.id,
      memberName: m.fullName ?? m.email ?? 'Member',
      employerName: rec.employerName ?? null,
      jobTitle: rec.jobTitle ?? null,
      placedAt: rec.placedAt ? rec.placedAt.toISOString() : null,
      paid,
      blockedReason,
    };
  });
  const payoutsAvailable =
    isPayoutEligibleType(partner.partnerType) &&
    !!partner.stripeConnectId &&
    partner.stripeConnectStatus === 'active';
  const payoutsUnavailableReason = payoutsAvailable
    ? null
    : !isPayoutEligibleType(partner.partnerType)
      ? 'Payouts are only available for referral-track partners.'
      : !partner.stripeConnectId
        ? 'Partner has not connected a Stripe account yet.'
        : 'Partner Stripe account is not active yet.';
  let completions = 0;
  let placements = 0;
  let active = 0;
  for (const m of members) {
    if (m.placementRecord) placements++;
    else active++;
    if (memberProgramCompleted(m.enrolledProgram, null, m.memberProgramProgress)) {
      completions++;
    }
  }

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <PageHeader
        breadcrumbs={[{ label: 'Partners', href: '/admin/partners' }, { label: 'Partner Details' }]}
        title={partner.name}
        subtitle={`${partner._count.counselors} counselor${partner._count.counselors !== 1 ? 's' : ''} · ${partner._count.referrals} referral${partner._count.referrals !== 1 ? 's' : ''}`}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                background: partner.active ? 'rgba(74, 155, 79, 0.12)' : 'var(--surface-container)',
                color: partner.active ? '#2d7a32' : 'var(--color-on-surface-variant)',
              }}
            >
              {partner.active ? 'Active' : 'Inactive'}
            </span>
            <PartnerDetailActions partner={partner} subgroups={subgroups} allPartners={allPartners} />
          </div>
        }
      />

      <section style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--surface-container)', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Invite partner user</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
          Sends an email invitation with a link to the partner portal ({partner.contactEmail ? 'milestone notifications go to ' + partner.contactEmail : 'add a contact email on the partner record for notifications'}).
        </p>
        <InvitePartnerUserButton partnerId={partner.id} />
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {[
          { label: 'Total referred', value: members.length },
          { label: 'Active (not placed)', value: active },
          { label: 'Completions', value: completions },
          { label: 'Placements', value: placements },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: 'var(--surface-container)',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '2rem' }}>
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Counselors ({partner.counselors.length})</h2>
            <Link
              href={`/admin/partners/${id}/quarterly-outcomes`}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>assessment</span>
              Outcomes Report
            </Link>
          </div>
          {partner.counselors.length === 0 ? (
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>No counselors assigned yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {partner.counselors.map((c) => (
                <div key={c.id} style={{ padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 600 }}>{c.user.fullName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{c.user.email}</div>
                  {c.title && <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{c.title}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Partner details</h2>
          <p style={{ fontSize: '0.9rem', margin: '0.25rem 0' }}>
            <strong>Contact:</strong> {partner.contactName ?? '—'}
          </p>
          <p style={{ fontSize: '0.9rem', margin: '0.25rem 0' }}>
            <strong>Email:</strong> {partner.contactEmail ?? '—'}
          </p>
          <p style={{ fontSize: '0.9rem', margin: '0.25rem 0' }}>
            <strong>Phone:</strong> {partner.contactPhone ?? '—'}
          </p>
        </section>
      </div>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Referred members</h2>
        {members.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>No referrals recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <DataTable
              variant="admin"
              tableClassName="admin-table"
              scrollX={false}
              rows={partner.referrals}
              rowKey={(r) => r.id}
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  cell: (ref) => {
                    const m = ref.member;
                    return (
                      <Link href={`/admin/members/${m.id}`} style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                        {m.fullName}
                      </Link>
                    );
                  },
                },
                {
                  key: 'program',
                  header: 'Program',
                  cell: (ref) => {
                    const m = ref.member;
                    const program = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram) : null;
                    return program?.title ?? '—';
                  },
                },
                {
                  key: 'progress',
                  header: 'Progress',
                  cell: (ref) => {
                    const m = ref.member;
                    const pct = memberProgramProgressPct(m.enrolledProgram, null, m.memberProgramProgress);
                    return `${pct}%`;
                  },
                },
                {
                  key: 'status',
                  header: 'Status',
                  cell: (ref) => {
                    const m = ref.member;
                    const student: PipelineStudent = {
                      id: m.id,
                      fullName: m.fullName,
                      email: m.email,
                      enrolledProgram: m.enrolledProgram,
                      enrolledAt: m.enrolledAt,
                      assessmentCompleted: m.assessmentCompleted,
                      deletedAt: m.deletedAt,
                      placementRecord: m.placementRecord,
                      userCertifications: m.userCertifications,
                      applications: m.applications,
                      memberProgramProgress: m.memberProgramProgress,
                    };
                    const stage = getPipelineStage(student);
                    return PIPELINE_STAGE_LABELS[stage];
                  },
                },
                {
                  key: 'enrolled',
                  header: 'Enrolled',
                  cell: (ref) => ref.member.enrolledAt?.toLocaleDateString() ?? '—',
                },
              ]}
            />
          </div>
        )}
      </section>

      <PartnerPayoutsPanel
        partnerId={partner.id}
        rows={payoutRows}
        payoutAmountUsd={getPartnerPlacementPayoutUsd()}
        payoutsAvailable={payoutsAvailable}
        payoutsUnavailableReason={payoutsUnavailableReason}
      />
    </div>
  );
}
