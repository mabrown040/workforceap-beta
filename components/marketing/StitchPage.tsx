import type { ReactNode } from 'react';

export default function StitchPage({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`stitch-page ${className}`.trim()}>
      <div className="stitch-page__ambient stitch-page__ambient--one" aria-hidden />
      <div className="stitch-page__ambient stitch-page__ambient--two" aria-hidden />
      <main className="stitch-main stitch-container">{children}</main>
    </div>
  );
}
