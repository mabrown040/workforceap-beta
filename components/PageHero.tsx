export default function PageHero({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
  /** Extra classes on the hero section (e.g. themed background). */
  className?: string;
}) {
  return (
    <section className={`page-hero${className ? ` ${className}` : ''}`}>
      <div className="page-hero-content">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </div>
    </section>
  );
}
