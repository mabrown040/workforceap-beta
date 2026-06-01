'use client';

import { useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';
import Image from 'next/image';
import { ArrowRight, BookOpen, HelpCircle, GraduationCap, Mail } from 'lucide-react';
import { blogListingCardAlt, blogListingCardImage } from '@/lib/blog/blogListingImage';
import { formatPublishedDate } from '@/lib/blog/formatPublishedDate';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  heroImage: string | null;
  authorName: string;
  publishedAt: Date | null;
  category: string | null;
};

export default function BlogListingClient({
  posts,
  categories,
}: {
  posts: Post[];
  categories: string[];
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const filtered = filter ? posts.filter((p) => p.category === filter) : posts;
  const hasPosts = posts.length > 0;

  return (
    <section className="blog-page-section">
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: 'clamp(1rem, 4vw, 2rem) clamp(1rem, 4vw, 2rem) 2rem',
        }}
      >
        {/* Quick Resources */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: '1rem',
            marginBottom: '2.5rem',
          }}
        >
          <LocalizedLink
            href="/programs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem',
              background: 'var(--surface-container)',
              borderRadius: '12px',
              textDecoration: 'none',
              color: 'var(--color-on-surface)',
            }}
          >
            <GraduationCap size={28} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{hasPosts ? 'Explore Programs' : 'Start with Programs'}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                {WORKFORCEAP_PROGRAM_CATALOG_SIZE} career training options
              </div>
            </div>
            <ArrowRight size={20} style={{ marginLeft: 'auto', opacity: 0.5, flexShrink: 0 }} />
          </LocalizedLink>
          <LocalizedLink
            href="/faq"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem',
              background: 'var(--surface-container)',
              borderRadius: '12px',
              textDecoration: 'none',
              color: 'var(--color-on-surface)',
            }}
          >
            <HelpCircle size={28} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{hasPosts ? 'Read FAQ' : 'Get Answers Fast'}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                Common questions answered
              </div>
            </div>
            <ArrowRight size={20} style={{ marginLeft: 'auto', opacity: 0.5, flexShrink: 0 }} />
          </LocalizedLink>
        </div>

        {categories.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '2rem',
            }}
          >
            <button
              type="button"
              onClick={() => setFilter(null)}
              className="blog-filter-chip"
              data-active={filter === null ? 'true' : 'false'}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className="blog-filter-chip"
                data-active={filter === cat ? 'true' : 'false'}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="blog-listing-grid">
          {filtered.map((post) => {
            const cardSrc = blogListingCardImage(post.heroImage, post.coverImage, post.category, post.slug);
            const cardAlt = blogListingCardAlt({
              title: post.title,
              heroImage: post.heroImage,
              coverImage: post.coverImage,
              category: post.category,
              slug: post.slug,
            });
            return (
              <article key={post.id} className="blog-card">
                <LocalizedLink href={`/blog/${post.slug}`} className="blog-card-link">
                  <div className="blog-card-cover">
                    <Image
                      src={cardSrc}
                      alt={cardAlt}
                      width={400}
                      height={250}
                      sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {post.category && <span className="blog-card-category">{post.category}</span>}
                  </div>
                  <h2 className="blog-card-title">{post.title}</h2>
                  {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
                  <div className="blog-card-meta">
                    {post.authorName}
                    {post.publishedAt && (
                      <> · {formatPublishedDate(post.publishedAt)}</>
                    )}
                  </div>
                  <span className="blog-card-cta">{post.title ? `Read more: ${post.title}` : 'Read more'}</span>
                </LocalizedLink>
              </article>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="blog-empty-state">
            <p>
              {posts.length === 0
                ? 'No articles are published yet. For now, use the FAQ, browse programs, or start your application without waiting on the blog.'
                : 'No posts match this filter.'}
            </p>
            {posts.length > 0 && filter !== null && (
              <button type="button" className="btn btn-muted blog-empty-state__clear" onClick={() => setFilter(null)}>
                Show all posts
              </button>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <LocalizedLink href="/programs" className="btn btn-primary">
                Browse programs
              </LocalizedLink>
              <LocalizedLink href="/apply" className="btn btn-muted">
                Apply
              </LocalizedLink>
              <LocalizedLink href="/faq" className="btn btn-outline">
                Read FAQ
              </LocalizedLink>
            </div>
          </div>
        )}

        {/* Updates via contact — functional path */}
        <div className="blog-updates-card">
          <Mail size={28} style={{ color: 'var(--color-accent)', marginBottom: '0.75rem' }} aria-hidden />
          <h3 className="blog-updates-card__title">Want updates?</h3>
          <p className="blog-updates-card__text">
            Ask to be notified about new articles and program news — our team responds within a few business days.
          </p>
          <LocalizedLink href="/contact" className="btn btn-primary">
            Contact us for updates
          </LocalizedLink>
        </div>

        {/* Bottom CTA */}
        <div className="blog-listing-bottom-cta">
          <BookOpen size={40} style={{ margin: '0 auto 1rem', opacity: 0.95 }} aria-hidden />
          <h3>Ready to take the next step?</h3>
          <p>
            WorkforceAP offers no-cost career training paths for <LocalizedLink href="/apply" style={{ color: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}>qualifying members</LocalizedLink> — with guided tools, counselor support, and employer-aligned credentials.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <LocalizedLink href="/find-your-path" className="btn blog-listing-bottom-cta__secondary">
              Find Your Path
            </LocalizedLink>
            <LocalizedLink href="/programs" className="btn blog-listing-bottom-cta__ghost">
              Explore Programs
            </LocalizedLink>
            <LocalizedLink href="/apply" className="btn blog-listing-bottom-cta__ghost">
              Apply Now
            </LocalizedLink>
          </div>
        </div>
      </div>
    </section>
  );
}
