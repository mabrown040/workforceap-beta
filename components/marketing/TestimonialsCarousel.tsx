import { prisma } from '@/lib/db/prisma';
import { Prisma, TestimonialStatus } from '@prisma/client';
import Image from 'next/image';
import { Quote, Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getProgramBySlug } from '@/lib/content/programs';

type PublishedTestimonial = Prisma.TestimonialGetPayload<{
  include: {
    member: {
      select: {
        fullName: true;
        enrolledProgram: true;
      };
    };
  };
}>;

/**
 * Server component: fetch approved/published testimonials and render
 * a simple grid. Used on public marketing pages like /impact.
 */
export default async function TestimonialsCarousel({ limit = 6 }: { limit?: number }) {
  const t = await getTranslations('marketing.publicImpact');
  let testimonials: PublishedTestimonial[];

  try {
    testimonials = await prisma.testimonial.findMany({
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
    });
  } catch {
    testimonials = [];
  }

  if (testimonials.length === 0) {
    return (
      <div className="wa-info-card">
        <h3>{t('testimonialsEmptyTitle')}</h3>
        <p>{t('testimonialsEmptyDesc')}</p>
      </div>
    );
  }

  return (
    <div className="testimonials-carousel__grid">
      {testimonials.map((testimonial) => {
        const enrolledProgramTitle = testimonial.member.enrolledProgram
          ? getProgramBySlug(testimonial.member.enrolledProgram)?.title ?? testimonial.member.enrolledProgram
          : null;

        return (
        <div key={testimonial.id} className="wa-story-card">
          <div className="wa-story-card__top">
            <Quote className="w-5 h-5 wa-story-card__quote" aria-hidden="true" />
            {testimonial.rating && (
              <div className="wa-story-card__stars" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5"
                    style={{
                      color: i < testimonial.rating! ? '#f59e0b' : '#d4d4d8',
                      fill: i < testimonial.rating! ? '#f59e0b' : 'none',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <p className="wa-story-card__quote-text">{testimonial.content}</p>

          <div className="wa-story-card__author">
            {testimonial.photoUrl ? (
              <Image
                src={testimonial.photoUrl}
                alt={testimonial.member.fullName ? `${testimonial.member.fullName} photo` : 'Member photo'}
                width={40}
                height={40}
                unoptimized
                className="wa-story-card__avatar"
              />
            ) : (
              <div className="wa-story-card__avatar wa-story-card__avatar--initial" aria-hidden="true">
                {testimonial.member.fullName?.charAt(0).toUpperCase() ?? 'M'}
              </div>
            )}
            <div>
              <div className="wa-story-card__name">{testimonial.member.fullName}</div>
              {enrolledProgramTitle ? (
                <div className="wa-story-card__program">{enrolledProgramTitle}</div>
              ) : null}
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}
