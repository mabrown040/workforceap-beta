import Link from 'next/link';

interface PhotoHighlightProps {
  imageUrl: string;
  label: string;
  title: string;
  description: string;
  buttonText?: string;
  buttonHref?: string;
}

export default function PhotoHighlight({
  imageUrl,
  label,
  title,
  description,
  buttonText,
  buttonHref,
}: PhotoHighlightProps) {
  return (
    <section className="photo-highlight">
      <div className="photo-highlight-bg" style={{ backgroundImage: `url('${imageUrl}')` }} />
      <div className="photo-highlight-overlay" />
      <div className="container">
        <div className="photo-highlight-content animate-on-scroll">
          <span className="section-label" style={{ color: 'var(--color-gold)' }}>{label}</span>
          <h2>{title}</h2>
          <p>{description}</p>
          {buttonText && buttonHref && (
            <Link href={buttonHref} className="btn btn-ghost">{buttonText}</Link>
          )}
        </div>
      </div>
    </section>
  );
}
