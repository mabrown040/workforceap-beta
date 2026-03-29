import type { ReactNode } from 'react';

type StitchHeroProps = {
  badge: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  meta?: ReactNode;
  align?: 'left' | 'center';
};

export default function StitchHero({
  badge,
  title,
  description,
  actions,
  aside,
  meta,
  align = 'left',
}: StitchHeroProps) {
  const center = align === 'center';

  return (
    <section className={`stitch-hero${center ? ' stitch-hero--center' : ''}`}>
      <div className="stitch-hero__copy">
        <div className="stitch-badge">{badge}</div>
        <h1 className="stitch-title">{title}</h1>
        <div className="stitch-lead">{description}</div>
        {actions ? <div className="stitch-actions">{actions}</div> : null}
        {meta ? <div className="stitch-hero__meta">{meta}</div> : null}
      </div>
      {aside ? <div className="stitch-hero__aside">{aside}</div> : null}
    </section>
  );
}
