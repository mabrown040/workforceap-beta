import type { CSSProperties } from 'react';
import Link from 'next/link';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import { PortalInput } from '@/components/portal/ui/PortalInput';

export function InboxShell({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`portal-inbox ${className}`.trim()}
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        height: 'min(85vh, 900px)',
        border: '1px solid color-mix(in srgb, var(--outline-variant) 70%, transparent)',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function InboxPane({
  children,
  className = '',
  style,
  variant = 'list',
}: {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: 'list' | 'thread';
}) {
  return (
    <div
      className={`portal-inbox__pane portal-inbox__pane--${variant} ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function InboxHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="portal-inbox__header">
      <div style={{ minWidth: 0 }}>
        <h2 className="portal-inbox__title">{title}</h2>
        {subtitle ? <p className="portal-inbox__subtitle">{subtitle}</p> : null}
      </div>
      {right ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
    </div>
  );
}

export function InboxSearch({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="portal-inbox__search">
      <PortalInput
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function InboxList({ children }: { children: React.ReactNode }) {
  return <div className="portal-inbox__list">{children}</div>;
}

export function InboxRowButton({
  active,
  unread,
  needsReply,
  onClick,
  children,
}: {
  active: boolean;
  unread?: boolean;
  /** Last message from member — prioritize in list styling */
  needsReply?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`portal-inbox-row${active ? ' portal-inbox-row--active' : ''}${
        unread ? ' portal-inbox-row--unread' : ''
      }${needsReply ? ' portal-inbox-row--needs-reply' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function InboxRowLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="portal-inbox-row">
      {children}
    </Link>
  );
}

export function InboxRowLayout({
  title,
  subtitle,
  preview,
  meta,
  badge,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  preview?: React.ReactNode;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="portal-inbox-row__inner">
      <div className="portal-inbox-row__main">
        <div className="portal-inbox-row__top">
          <div className="portal-inbox-row__title">{title}</div>
          {subtitle ? <div className="portal-inbox-row__subtitle">{subtitle}</div> : null}
          {meta ? <div className="portal-inbox-row__meta">{meta}</div> : null}
        </div>
        {subtitle ? <div className="portal-inbox-row__subtitle">{subtitle}</div> : null}
        {preview ? <div className="portal-inbox-row__preview">{preview}</div> : null}
      </div>
      {badge ? <div className="portal-inbox-row__badge">{badge}</div> : null}
    </div>
  );
}

export function InboxUnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className="portal-inbox-unread">{count} new</span>;
}

export function InboxEmpty({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="portal-inbox__empty">
      <PortalEmptyState title={title} description={description} />
    </div>
  );
}

