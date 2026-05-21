import type { EmployerCaseStudy } from '@/lib/content/employer-case-studies';

type EmployerCaseStudyCardProps = {
  study: EmployerCaseStudy;
  variant?: 'default' | 'accent';
};

export default function EmployerCaseStudyCard({
  study,
  variant = 'default',
}: EmployerCaseStudyCardProps) {
  const isAccent = variant === 'accent';
  const bg = isAccent ? 'var(--color-accent)' : 'var(--surface-container-lowest)';
  const borderColor = isAccent ? 'rgba(255,255,255,0.2)' : 'var(--outline-variant)';
  const labelColor = isAccent ? 'rgba(255,255,255,0.9)' : 'var(--color-accent)';
  const metaColor = isAccent ? 'rgba(255,255,255,0.75)' : 'var(--color-on-surface-variant)';
  const quoteColor = isAccent ? 'rgba(255,255,255,0.9)' : 'var(--color-on-surface-variant)';
  const nameColor = isAccent ? '#fff' : 'var(--color-on-surface)';
  const titleColor = isAccent ? 'rgba(255,255,255,0.8)' : 'var(--color-on-surface-variant)';
  const statColor = isAccent ? 'rgba(255,255,255,0.85)' : 'var(--color-on-surface)';

  const stats = `${study.members_hired} hired · ${study.avg_tenure_months}mo avg tenure · ${study.role_filled}`;

  return (
    <article
      className="employer-case-study-card"
      aria-label={`Case study from ${study.company}`}
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-xl, 1rem)',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        height: '100%',
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span
          className="text-label-upper"
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            color: labelColor,
            fontWeight: 700,
          }}
        >
          {study.company} · {study.industry}
        </span>
        <span style={{ fontSize: '0.8125rem', color: metaColor }}>{study.location}</span>
      </header>

      <p
        style={{
          margin: 0,
          fontSize: '0.8125rem',
          fontWeight: 600,
          lineHeight: 1.5,
          color: statColor,
        }}
      >
        {stats}
      </p>

      <blockquote
        style={{
          margin: 0,
          fontSize: '0.9rem',
          color: quoteColor,
          fontStyle: 'italic',
          borderLeft: `2px solid ${isAccent ? 'rgba(255,255,255,0.35)' : 'var(--color-accent)'}`,
          paddingLeft: '1rem',
          lineHeight: 1.7,
          flex: 1,
        }}
      >
        &ldquo;{study.quote}&rdquo;
      </blockquote>

      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginTop: 'auto',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={study.attribution_avatar}
          alt=""
          width={44}
          height={44}
          style={{
            width: '2.75rem',
            height: '2.75rem',
            borderRadius: '9999px',
            objectFit: 'cover',
            flexShrink: 0,
            background: isAccent ? 'rgba(255,255,255,0.15)' : 'var(--surface-container-high)',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: nameColor }}>
            {study.attribution_name}
          </span>
          <span style={{ fontSize: '0.8125rem', color: titleColor }}>
            {study.attribution_title}, {study.company}
          </span>
        </div>
      </footer>
    </article>
  );
}
