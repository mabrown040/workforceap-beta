'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const BLOG_FALLBACK_BG = '#0f172a';

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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '2rem',
        }}
      >
        {filtered.map((post) => (
          <article key={post.id}>
            <Link
              href={`/blog/${post.slug}`}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  aspectRatio: '16/10',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#eee',
                  marginBottom: '1rem',
                }}
              >
                {post.coverImage ? (
                  <Image
                    src={post.coverImage}
                    alt=""
                    width={400}
                    height={250}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: BLOG_FALLBACK_BG,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.5rem',
                    }}
                  >
                    <Image
                      src="/images/logo-tight.png"
                      alt=""
                      width={160}
                      height={90}
                      style={{ width: '40%', height: 'auto', opacity: 0.9, objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>
              {post.category && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                  }}
                >
                  {post.category}
                </span>
              )}
              <h2
                style={{
                  marginTop: '0.5rem',
                  marginBottom: '0.5rem',
                  fontSize: '1.25rem',
                  lineHeight: 1.3,
                }}
              >
                {post.title}
              </h2>
              {post.excerpt && (
                <p
                  style={{
                    fontSize: '0.95rem',
                    color: '#555',
                    lineHeight: 1.5,
                  }}
                >
                  {post.excerpt}
                </p>
              )}
              <div
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.85rem',
                  color: '#888',
                }}
              >
                {post.authorName}
                {post.publishedAt && (
                  <> · {new Date(post.publishedAt).toLocaleDateString('en-US')}</>
                )}
              </div>
            </Link>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666', padding: '3rem' }}>
          No posts found.
        </p>
      )}
    </section>
  );
}
