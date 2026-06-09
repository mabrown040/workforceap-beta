'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './TestimonialCarousel.module.css';

interface Testimonial {
  id: string;
  firstName: string;
  lastInitial: string;
  photoUrl?: string;
  formerJob: string;
  newJob: string;
  wage: string;
  timeSincePlacement: string;
  programName: string;
  quote?: string;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  fallbackStats?: {
    placementRate: number;
    timeframe: string;
    programName: string;
  };
}

export default function TestimonialCarousel({ testimonials, fallbackStats }: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (testimonials.length === 0 && fallbackStats) {
    return (
      <div className={styles['fallback-card']} role="region" aria-label="Program outcomes">
        <div className={styles['fallback-stat']}>
          <span className={styles['fallback-number']}>{fallbackStats.placementRate}%</span>
          <span className={styles['fallback-label']}>of {fallbackStats.programName} grads employed within {fallbackStats.timeframe}</span>
        </div>
        <p className={styles['fallback-note']}>Real results from real members. Testimonials coming soon.</p>
      </div>
    );
  }

  if (testimonials.length === 0) return null;

  const current = testimonials[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < testimonials.length - 1;

  return (
    <div className={styles['carousel']} role="region" aria-label="Member testimonials">
      <div className={styles['card']}>
        <div className={styles['photo-row']}>
          {current.photoUrl ? (
            <Image
              src={current.photoUrl}
              alt={`Photo of ${current.firstName} ${current.lastInitial}.`}
              width={64}
              height={64}
              className={styles['photo']}
              priority={currentIndex === 0}
            />
          ) : (
            <div className={styles['photo-placeholder']} aria-hidden="true">
              {current.firstName[0]}{current.lastInitial}
            </div>
          )}
          <div className={styles['meta']}>
            <p className={styles['name']}>{current.firstName} {current.lastInitial}.</p>
            <p className={styles['job-change']}>
              {current.formerJob} → {current.newJob}
            </p>
            <p className={styles['wage']}>{current.wage} · {current.timeSincePlacement}</p>
          </div>
        </div>
        {current.quote && (
          <blockquote className={styles['quote']}>
            "{current.quote}"
          </blockquote>
        )}
        <p className={styles['program-tag']}>{current.programName}</p>
      </div>

      {testimonials.length > 1 && (
        <div className={styles['controls']}>
          <button
            type="button"
            className={styles['control-btn']}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={!canGoPrev}
            aria-label="Previous testimonial"
          >
            ←
          </button>
          <div className={styles['dots']} role="tablist">
            {testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                className={styles['dot'] + (i === currentIndex ? ' ' + styles['active'] : '')}
                onClick={() => setCurrentIndex(i)}
                role="tab"
                aria-selected={i === currentIndex}
                aria-label={`Testimonial ${i + 1} of ${testimonials.length}`}
              />
            ))}
          </div>
          <button
            type="button"
            className={styles['control-btn']}
            onClick={() => setCurrentIndex((i) => Math.min(testimonials.length - 1, i + 1))}
            disabled={!canGoNext}
            aria-label="Next testimonial"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
