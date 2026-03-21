'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, HelpCircle, GraduationCap } from 'lucide-react';

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
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
    <section
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
      }}
    >
      {/* Quick Resources */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '2.5rem',
      }}>
        <Link href="/programs" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.25rem',
          background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
          borderRadius: '12px',
          textDecoration: 'none',
          color: '#1a1a1a',
          border: '1px solid #dee2e6',
        }}>
          <GraduationCap size={28} style={{ color: '#ad2c4d' }} />
          <div>
            <div style={{ fontWeight: 600 }}>Explore Programs</div>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>19 career training options</div>
          </div>
          <ArrowRight size={20} style={{ marginLeft: 'auto', opacity: 0.5 }} />
        </Link>
        <Link href="/faq" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.25rem',
          background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
          borderRadius: '12px',
          textDecoration: 'none',
          color: '#1a1a1a',
          border: '1px solid #dee2e6',
        }}>
          <HelpCircle size={28} style={{ color: '#ad2c4d' }} />
          <div>
            <div style={{ fontWeight: 600 }}>Read FAQ</div>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>Common questions answered</div>
          </div>
          <ArrowRight size={20} style={{ marginLeft: 'auto', opacity: 0.5 }} />
        </Link>
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
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '999px',
              border: `1px solid ${filter === null ? 'var(--color-accent)' : '#ccc'}`,
              background: filter === null ? 'rgba(74, 155, 79, 0.1)' : 'transparent',
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
                border: `1px solid ${filter === cat ? 'var(--color-accent)' : '#ccc'}`,
                background: filter === cat ? 'rgba(74, 155, 79, 0.1)' : 'transparent',
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
        {filtered.map((post) => (
          <article key={post.id} className="blog-card">
            <Link href={`/blog/${post.slug}`} className="blog-card-link">
              <div className="blog-card-cover">
                {post.coverImage ? (
                  <Image
                    src={post.coverImage}
                    alt={post.title ? `Cover image for ${post.title}` : 'Blog post cover image'}
                    width={400}
                    height={250}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="blog-card-fallback" aria-hidden>
                    <Image
                      src="/images/logo-tight.png"
                      alt=""
                      width={160}
                      height={90}
                      style={{ width: '40%', height: 'auto', opacity: 0.9, objectFit: 'contain' }}
                    />
                  </div>
                )}
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
        ))}
      </div>
      {filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666', padding: '3rem' }}>
          No posts found.
        </p>
      )}

      {/* Bottom CTA */}
      <div style={{
        marginTop: '4rem',
        padding: '2.5rem',
        background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
        borderRadius: '16px',
        textAlign: 'center',
        color: 'white',
      }}>
        <BookOpen size={40} style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
        <h3 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.75rem' }}>
          Want personalized career guidance?
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
          Read our blog for tips, or get started finding the right program for your goals.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/find-your-path" className="btn btn-primary">
            Take Career Quiz
          </Link>
          <Link href="/programs" className="btn" style={{ background: 'white', color: '#1a1a1a' }}>
            Browse Programs
          </Link>
        </div>
      </div>
    </section>
  );
}
