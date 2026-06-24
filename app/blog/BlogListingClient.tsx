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
      <div className="blog-wrap">
        {/* Quick Resources */}
        <div className="blog-quick">
          <LocalizedLink href="/programs" className="blog-qcard">
            <span className="blog-qic" aria-hidden="true">
              <GraduationCap size={26} />
            </span>
            <span className="blog-qtext">
              <span className="blog-qt">{hasPosts ? 'Explore Programs' : 'Start with Programs'}</span>
              <span className="blog-qs">
                {WORKFORCEAP_PROGRAM_CATALOG_SIZE} career training options
              </span>
            </span>
            <span className="blog-qarr" aria-hidden="true">
              <ArrowRight size={20} />
            </span>
          </LocalizedLink>
          <LocalizedLink href="/faq" className="blog-qcard">
            <span className="blog-qic" aria-hidden="true">
              <HelpCircle size={26} />
            </span>
            <span className="blog-qtext">
              <span className="blog-qt">{hasPosts ? 'Read FAQ' : 'Get Answers Fast'}</span>
              <span className="blog-qs">Common questions answered</span>
            </span>
            <span className="blog-qarr" aria-hidden="true">
              <ArrowRight size={20} />
            </span>
          </LocalizedLink>
        </div>

        {categories.length > 0 && (
          <div className="blog-chips-row" role="group" aria-label="Filter posts by category">
            <button
              type="button"
              onClick={() => setFilter(null)}
              className="blog-fchip"
              data-active={filter === null ? 'true' : 'false'}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className="blog-fchip"
                data-active={filter === cat ? 'true' : 'false'}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="blog-grid">
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
              <article key={post.id} className="blog-bcard">
                <LocalizedLink href={`/blog/${post.slug}`} className="blog-bcard-link">
                  <span className="blog-bcover">
                    <Image
                      src={cardSrc}
                      alt={cardAlt}
                      width={280}
                      height={160}
                      sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {post.category && <span className="blog-bcat">{post.category}</span>}
                  </span>
                  <span className="blog-bbody">
                    <span className="blog-btitle">{post.title}</span>
                    {post.excerpt && <span className="blog-bexc">{post.excerpt}</span>}
                    <span className="blog-bmeta">
                      {post.authorName}
                      {post.publishedAt && (
                        <> · {formatPublishedDate(post.publishedAt)}</>
                      )}
                    </span>
                    <span className="blog-bcta">
                      {post.title ? `Read more: ${post.title}` : 'Read more'}
                      <ArrowRight size={16} aria-hidden="true" />
                    </span>
                  </span>
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
              <button type="button" className="wa-btn wa-btn--ghost blog-empty-state__clear" onClick={() => setFilter(null)}>
                Show all posts
              </button>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <LocalizedLink href="/programs" className="wa-btn wa-btn--primary">
                Browse programs
              </LocalizedLink>
              <LocalizedLink href="/apply" className="wa-btn wa-btn--ghost">
                Apply
              </LocalizedLink>
              <LocalizedLink href="/faq" className="wa-btn wa-btn--ghost">
                Read FAQ
              </LocalizedLink>
            </div>
          </div>
        )}

        {/* Updates via contact — functional path */}
        <div className="blog-updates-card">
          <span className="blog-updates-ic" aria-hidden="true">
            <Mail size={28} />
          </span>
          <h2 className="blog-updates-card__title">Want updates?</h2>
          <p className="blog-updates-card__text">
            Ask to be notified about new articles and program news — our team responds within a few business days.
          </p>
          <LocalizedLink href="/contact" className="wa-btn wa-btn--primary">
            Contact us for updates
          </LocalizedLink>
        </div>

        {/* Bottom CTA */}
        <div className="blog-listing-bottom-cta">
          <BookOpen size={44} className="blog-cta-ic" aria-hidden="true" />
          <h2>Ready to take the next step?</h2>
          <p>
            WorkforceAP offers no-cost career training paths for <LocalizedLink href="/apply" style={{ color: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}>qualifying members</LocalizedLink> — with guided tools, advisor support, and employer-aligned credentials.
          </p>
          <div className="blog-cta-acts">
            <LocalizedLink href="/find-your-path" className="wa-btn blog-listing-bottom-cta__secondary">
              Find Your Path
            </LocalizedLink>
            <LocalizedLink href="/programs" className="wa-btn blog-listing-bottom-cta__ghost">
              Explore Programs
            </LocalizedLink>
            <LocalizedLink href="/apply" className="wa-btn blog-listing-bottom-cta__ghost">
              Apply Now
            </LocalizedLink>
          </div>
        </div>
      </div>
    </section>
  );
}
