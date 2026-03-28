'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, HelpCircle, GraduationCap } from 'lucide-react';
import { blogListingCardImage } from '@/lib/blog/blogListingImage';

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
  const filtered = filter
    ? posts.filter((p) => p.category === filter)
    : posts;

  return (
    <section className="blog-listing-wrapper">
      {/* Quick Resources */}
      <div className="blog-listing-resources-grid">
        <Link href="/programs" className="blog-listing-resource-link">
          <GraduationCap size={28} style={{ color: 'var(--color-accent)' }} />
          <div>
            <div style={{ fontWeight: 600 }}>Explore Programs</div>
            <div className="blog-listing-resource-link__sub">19 career training options</div>
          </div>
          <ArrowRight size={20} style={{ marginLeft: 'auto', opacity: 0.5 }} />
        </Link>
        <Link href="/faq" className="blog-listing-resource-link">
          <HelpCircle size={28} style={{ color: 'var(--color-accent)' }} />
          <div>
            <div style={{ fontWeight: 600 }}>Read FAQ</div>
            <div className="blog-listing-resource-link__sub">Common questions answered</div>
          </div>
          <ArrowRight size={20} style={{ marginLeft: 'auto', opacity: 0.5 }} />
        </Link>
      </div>

      {categories.length > 0 && (
        <div className="blog-listing-filters">
          <button
            type="button"
            onClick={() => setFilter(null)}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '999px',
              border: `1px solid ${filter === null ? 'var(--color-accent)' : 'var(--color-border)'}`,
              background: filter === null ? 'rgba(173, 44, 77, 0.1)' : 'transparent',
              color: filter === null ? 'var(--color-accent)' : 'inherit',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '999px',
                border: `1px solid ${filter === cat ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: filter === cat ? 'rgba(173, 44, 77, 0.1)' : 'transparent',
                color: filter === cat ? 'var(--color-accent)' : 'inherit',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      <div className="blog-listing-grid">
        {filtered.map((post) => {
          const cardSrc = blogListingCardImage(post.heroImage, post.coverImage);
          return (
          <article key={post.id} className="blog-card">
            <Link href={`/blog/${post.slug}`} className="blog-card-link">
              <div className="blog-card-cover">
                <Image
                  src={cardSrc}
                  alt={post.title ? `Cover image for ${post.title}` : 'Blog post cover image'}
                  width={400}
                  height={250}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {post.category && (
                  <span className="blog-card-category">{post.category}</span>
                )}
              </div>
              <h2 className="blog-card-title">{post.title}</h2>
              {post.excerpt && (
                <p className="blog-card-excerpt">{post.excerpt}</p>
              )}
              <div className="blog-card-meta">
                {post.authorName}
                {post.publishedAt && (
                  <> · {new Date(post.publishedAt).toLocaleDateString('en-US')}</>
                )}
              </div>
              <span className="blog-card-cta">Read More →</span>
            </Link>
          </article>
        );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="blog-listing-empty">No posts found.</p>
      )}

      {/* Bottom CTA */}
      <div className="blog-listing-cta">
        <BookOpen size={40} style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
        <h3 className="blog-listing-cta__title">Want personalized career guidance?</h3>
        <p className="blog-listing-cta__desc">
          Read our blog for tips, or get started finding the right program for your goals.
        </p>
        <div className="blog-listing-cta__actions">
          <Link href="/find-your-path" className="btn btn-primary">Take Career Quiz</Link>
          <Link href="/programs" className="btn btn-white">Browse Programs</Link>
        </div>
      </div>
    </section>
  );
}
