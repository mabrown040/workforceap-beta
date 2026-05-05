'use client';

import Link from 'next/link';
import { getAIToolFollowThrough } from '@/lib/member/aiToolFollowThrough';

export default function ToolFollowThrough({
  toolType,
  inputSummary,
  output,
}: {
  toolType: string;
  inputSummary?: string | null;
  output?: string | null;
}) {
  const next = getAIToolFollowThrough({ toolType, inputSummary, output });

  return (
    <div
      style={{
        marginTop: '1.25rem',
        borderLeft: '4px solid var(--color-accent)',
        background: 'var(--surface-container)',
        borderRadius: '0.75rem',
        padding: '1rem',
      }}
    >
      <p
        style={{
          margin: '0 0 0.25rem',
          fontSize: '0.6875rem',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-accent)',
        }}
      >
        Do this next
      </p>
      <p
        style={{
          margin: '0 0 0.25rem',
          fontSize: '0.9375rem',
          fontWeight: 700,
          color: 'var(--color-on-surface)',
        }}
      >
        {next.title}
      </p>
      <p
        style={{
          margin: '0 0 0.75rem',
          fontSize: '0.8125rem',
          lineHeight: 1.55,
          color: 'var(--color-on-surface-variant)',
        }}
      >
        {next.body}
      </p>
      <Link href={next.href} className="btn btn-outline">
        {next.cta}
      </Link>
    </div>
  );
}
