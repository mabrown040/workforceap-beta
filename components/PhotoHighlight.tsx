import LocalizedLink from '@/components/LocalizedLink';
import Image from 'next/image';

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
      <Image
        src={imageUrl}
        alt={title}
        fill
        loading="lazy"
        sizes="100vw"
        quality={70}
        className="photo-highlight-bg"
      />
      <div className="photo-highlight-overlay" />
      <div className="container">
        <div className="photo-highlight-content animate-on-scroll">
          <span className="section-label" style={{ color: 'var(--color-gold)' }}>{label}</span>
          <h2>{title}</h2>
          <p>{description}</p>
          {buttonText && buttonHref && (
            <LocalizedLink href={buttonHref} className="btn btn-secondary btn-radius-md">{buttonText}</LocalizedLink>
          )}
        </div>
      </div>
    </section>
  );
}
