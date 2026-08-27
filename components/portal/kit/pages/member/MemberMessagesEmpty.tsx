import { MessageCircle } from 'lucide-react';
import { DesignSurface, KitEmptyState, PageOpener } from '@/components/portal/kit';

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
        <div className="wa-kit-card">
          <KitEmptyState
            title={title}
            description={description}
            action={
              <a href={actionHref} className="wa-kit-cta wa-kit-focus hover:wa-opacity-90">
                {actionLabel}
              </a>
            }
          />
        </div>
      </div>
    </DesignSurface>
  );
}
