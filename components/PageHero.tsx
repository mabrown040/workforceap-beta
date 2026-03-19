import Link from 'next/link';

export default function PageHero({
  title,
  subtitle,
  quizCta,
}: {
  title: string;
  subtitle: string;
  quizCta?: string;
}) {
  return (
    <section className="page-hero">
      <div className="page-hero-content">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {quizCta && (
          <p className="page-hero-quiz-cta">
            <Link href="/find-your-path">{quizCta}</Link>
          </p>
        )}
      </div>
    </section>
  );
}
