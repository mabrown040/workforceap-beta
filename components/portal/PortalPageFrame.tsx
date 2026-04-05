import PageHeader from '@/components/portal/PageHeader';

type PortalPageFrameProps = {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  maxWidth?: string;
  children: React.ReactNode;
};

export default function PortalPageFrame({
  title,
  subtitle,
  action,
  maxWidth = '80rem',
  children,
}: PortalPageFrameProps) {
  return (
    <div
      className="portal-page-frame"
      style={{ width: '100%', maxWidth, margin: '0 auto' }}
    >
      {title ? <PageHeader title={title} subtitle={subtitle} action={action} /> : null}
      {children}
    </div>
  );
}
