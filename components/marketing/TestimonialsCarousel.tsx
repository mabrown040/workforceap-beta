import { prisma } from '@/lib/db/prisma';
import { TestimonialStatus, type Testimonial } from '@prisma/client';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';
import { Quote, Star } from 'lucide-react';

type TestimonialWithMember = Testimonial & {
  member: { fullName: string; enrolledProgram: string | null };
};

async function loadTestimonials(limit: number): Promise<TestimonialWithMember[]> {
  // /impact is ISR — `npm run build` prerenders this server component. In
  // build environments using the placeholder Prisma URL, the query throws
  // and breaks the build. Skip the read entirely; the empty-state branch
  // below renders fine, and runtime requests revalidate with real data.
  if (
    process.env.__PRISMA_PLACEHOLDER_DB === '1' ||
    shouldSkipOptionalDbQueriesAtBuild()
  ) {
    return [];
  }
  try {
    return (await prisma.testimonial.findMany({
      where: {
        status: TestimonialStatus.PUBLISHED,
        deletedAt: null,
        consentGiven: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        member: {
          select: {
            fullName: true,
            enrolledProgram: true,
          },
        },
      },
    })) as TestimonialWithMember[];
  } catch (err) {
    // Belt-and-suspenders: a DB outage on a public marketing page should
    // never blow up the response. Empty list is a fine soft-fail.
    console.error('[TestimonialsCarousel] testimonial query failed:', err);
    return [];
  }
}

/**
 * Server component: fetch approved/published testimonials and render
 * a simple grid. Used on public marketing pages like /impact.
 */
export default async function TestimonialsCarousel({ limit = 6 }: { limit?: number }) {
  const testimonials = await loadTestimonials(limit);

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
      }}
    >
      {testimonials.map((t) => (
        <div
          key={t.id}
          style={{
            background: '#fff',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Quote className="w-5 h-5" style={{ color: 'var(--color-accent)', opacity: 0.6 }} />
            {t.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', marginLeft: 'auto' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5"
                    style={{
                      color: i < t.rating! ? '#f59e0b' : '#d4d4d8',
                      fill: i < t.rating! ? '#f59e0b' : 'none',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <p
            style={{
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              color: 'var(--color-on-surface)',
              flex: 1,
            }}
          >
            {t.content}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 'auto' }}>
            {t.photoUrl ? (
              <img
                src={t.photoUrl}
                alt={t.member.fullName ? `${t.member.fullName} photo` : 'Member photo'}
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '9999px',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '9999px',
                  background: 'var(--color-light, #f8f5f3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                {t.member.fullName?.charAt(0).toUpperCase() ?? 'M'}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{t.member.fullName}</div>
              {t.member.enrolledProgram && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                  {t.member.enrolledProgram}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
