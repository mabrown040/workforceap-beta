import { MessageCircle } from 'lucide-react';
import { DesignSurface, PageOpener } from '@/components/portal/kit';

/**
 * Member Portal — MESSAGES empty (inbox still provisioning).
 * Same PageOpener as MemberMessagesKit so the live no-member-row guard and
 * the /dev/member/messages?state=empty proof read as one product, not a
 * leftover PageHeader + PortalEmptyState.
 */
export function MemberMessagesEmpty({
  title = 'Inbox is being set up',
  description = 'Inbox is still provisioning. Email support if you need help now.',
  actionLabel = 'Email support',
  actionHref = 'mailto:info@workforceap.org',
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--wa-pad-sm)' }} className="wa-space-y-6">
        <PageOpener
          kicker="Inbox"
          title="Messages"
          lede="Counselor and support in one inbox."
          icon={<MessageCircle size={13} aria-hidden="true" />}
        />
        <div className="wa-kit-card" style={{ textAlign: 'center' }}>
          <MessageCircle size={32} aria-hidden="true" style={{ color: 'var(--wa-accent)', marginBottom: 12 }} />
          <h2 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', margin: '0 0 0.35rem' }}>
            {title}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--wa-muted)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            {description}
          </p>
          <a
            href={actionHref}
            className="wa-kit-focus hover:wa-opacity-90 wa-inline-flex wa-items-center wa-justify-center"
            style={{
              minHeight: 44,
              padding: '10px 16px',
              background: 'var(--wa-accent)',
              color: 'var(--wa-on-accent)',
              fontWeight: 600,
              fontSize: 14,
              borderRadius: 999,
              textDecoration: 'none',
            }}
          >
            {actionLabel}
          </a>
        </div>
      </div>
    </DesignSurface>
  );
}
