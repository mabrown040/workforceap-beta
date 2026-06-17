'use client';

import { useState } from 'react';
import PortalEmptyState from '@/components/portal/PortalEmptyState';

type Resource = {
  title: string;
  description: string;
  url: string;
};

export default function ResourcesClient({ resources }: { resources: Resource[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (resources.length === 0) {
    return (
      <PortalEmptyState
        icon={
          <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>
            folder_open
          </span>
        }
        title="No resources yet"
        description="Resources for your program will appear here once you're enrolled."
        primaryAction={{ href: '/dashboard/program', label: 'Choose a program' }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {resources.map((r, i) => {
        const isOpen = openIdx === i;
        return (
          <div
            key={r.url}
            className="portal-card portal-card--flat"
            style={{ overflow: 'hidden' }}
          >
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : i)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                padding: '1rem 1.25rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '0.5rem',
                  background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '1rem', color: 'var(--color-accent)' }}
                  aria-hidden="true"
                >
                  article
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.title}
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                  {r.description}
                </p>
              </div>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '1.125rem',
                  color: 'var(--color-on-surface-variant)',
                  flexShrink: 0,
                  transition: 'transform 0.15s',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
                aria-hidden="true"
              >
                expand_more
              </span>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--outline-variant)' }}>
                {/* Try to embed — many sites block iframes, so show description + prominent CTA */}
                <div style={{ padding: '1.25rem' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, margin: '0 0 1rem' }}>
                    {r.description}
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.5rem 1.125rem',
                        background: 'var(--color-accent)',
                        color: '#fff',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      Open resource
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">open_in_new</span>
                    </a>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                      Opens in a new tab
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
