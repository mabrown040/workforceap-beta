export default function PageHero({
  title,
  subtitle,
  children,
  className,
  beforeTitle,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
  /** Extra classes on the hero section (e.g. themed background). */
  className?: string;
  /** Renders above the title (e.g. breadcrumbs on portal pages that use the marketing hero). */
  beforeTitle?: React.ReactNode;
}) {
  return (
    <section className={`page-hero${className ? ` ${className}` : ''}`}>
      <div className="page-hero-content">
        {beforeTitle ? <div style={{ marginBottom: '0.75rem' }}>{beforeTitle}</div> : null}
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </div>
    </section>
  );
}
