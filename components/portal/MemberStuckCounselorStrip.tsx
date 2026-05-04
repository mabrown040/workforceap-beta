import Link from 'next/link';

type MemberStuckCounselorStripProps = {
  /** Primary: counselor messages; fallback contact page. */
  messagesHref?: string;
};

/**
 * Shown when enrolled training has gone quiet — see `isTrainingStaleForCounselorEscalation`.
 */
export default function MemberStuckCounselorStrip({
  messagesHref = '/dashboard/messages',
}: MemberStuckCounselorStripProps) {
  return (
    <aside
      className="portal-card portal-card--flat"
      style={{
        margin: '0 0 1.25rem',
        padding: '1rem 1.25rem',
        borderLeft: '4px solid var(--color-gold)',
        background: 'color-mix(in srgb, var(--color-gold) 8%, var(--surface-container-lowest))',
      }}
      aria-label="Counselor support"
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', flexShrink: 0 }}>
          support_agent
        </span>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-on-surface)' }}>
            Stuck? Talk to a counselor
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
            We haven&rsquo;t seen training activity in a while. Message your team or email{' '}
            <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              info@workforceap.org
            </a>
            .
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Link href={messagesHref} className="btn btn-primary btn-sm" style={{ fontSize: '0.8125rem' }}>
            Open messages
          </Link>
          <Link href="/contact?topic=training" className="btn btn-outline btn-sm" style={{ fontSize: '0.8125rem' }}>
            Contact
          </Link>
        </div>
      </div>
    </aside>
  );
}
