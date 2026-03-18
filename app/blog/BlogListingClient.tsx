'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
      <div className="blog-listing-grid">
        {filtered.map((post) => (
          <article key={post.id} className="blog-card">
            <Link href={`/blog/${post.slug}`} className="blog-card-link">
              <div className="blog-card-cover">
                {post.coverImage ? (
                  <Image
                    src={post.coverImage}
                    alt=""
                    width={400}
                    height={250}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="blog-card-fallback">
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
    </section>
  );
}
