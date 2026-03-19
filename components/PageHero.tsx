import Link from 'next/link';

export default function PageHero({
  title,
  subtitle,
  cta,
}: {
  title: string;
  subtitle: string;
  cta?: { text: string; href: string };
}) {
  return (
    <section className="page-hero">
      <div className="page-hero-content">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {cta && (
          <p style={{ marginTop: '1rem' }}>
            <Link href={cta.href} className="link-arrow" style={{ fontSize: '1rem' }}>
              {cta.text}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
