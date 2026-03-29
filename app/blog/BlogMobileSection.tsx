'use client';

import { useState } from 'react';
import Link from 'next/link';
import MobileBottomNav from '@/components/MobileBottomNav';

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  heroImage: string | null;
  authorName: string;
  publishedAt: Date | null;
  scheduledAt?: Date | null;
  category: string | null;
};

function formatDate(d: Date | null) {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function estimateReadTime(text: string | null | undefined): string {
  if (!text) return '3 min read';
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

export default function BlogMobileSection({
  posts,
  categories,
}: {
  posts: Post[];
  categories: string[];
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const filtered = filter ? posts.filter((p) => p.category === filter) : posts;

  return (
    <div className="wa-md:hidden" style={{ background: '#fcf9f8', minHeight: '100vh', paddingBottom: '8rem' }}>
      {/* Header */}
      <div style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '2rem', marginBottom: '2rem' }}>
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8c0f37]" style={{ marginBottom: '0.5rem', display: 'block' }}>
          Perspective
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1c1b1b] leading-tight" style={{ marginBottom: '0.75rem' }}>
          Blog and Updates
        </h1>
        <p className="text-[#584144] text-lg leading-relaxed font-medium">
          Stories, announcements, and career insights.
        </p>
      </div>

      {/* Category Filter Chips */}
      <div style={{ marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', overflowX: 'auto', paddingLeft: '1.5rem', paddingRight: '1.5rem', gap: '0.75rem', paddingBottom: '0.5rem', scrollBehavior: 'smooth', scrollbarWidth: 'none' }}>
          <button
            onClick={() => setFilter(null)}
            className={`transition-all ${
              filter === null
                ? 'bg-[#8c0f37] text-white'
                : 'bg-[#ebe7e7] text-[#584144]'
            }`}
            style={{ whiteSpace: 'nowrap', paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`transition-all ${
                filter === cat
                  ? 'bg-[#8c0f37] text-white'
                  : 'bg-[#ebe7e7] text-[#584144]'
              }`}
              style={{ whiteSpace: 'nowrap', paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              {cat}
            </button>
          ))}
          {/* Static fallback chips if no categories from DB */}
          {categories.length === 0 && (
            <>
              <button style={{ whiteSpace: 'nowrap', paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '9999px', background: '#ebe7e7', color: '#584144', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Career Tips</button>
              <button style={{ whiteSpace: 'nowrap', paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '9999px', background: '#ebe7e7', color: '#584144', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Program Updates</button>
              <button style={{ whiteSpace: 'nowrap', paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '9999px', background: '#ebe7e7', color: '#584144', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Success Stories</button>
              <button style={{ whiteSpace: 'nowrap', paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '9999px', background: '#ebe7e7', color: '#584144', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Industry News</button>
            </>
          )}
        </div>
      </div>

      {/* Blog Post Card List */}
      <div style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {filtered.length > 0 ? (
            filtered.map((post) => {
              const img = post.coverImage || post.heroImage;
              return (
                <article key={post.id} className="group">
                  {img && (
                    <div style={{ position: 'relative', marginBottom: '1rem', overflow: 'hidden', borderRadius: '0.75rem', background: '#f6f3f2', aspectRatio: '4/3' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={post.title}
                        className="group-hover:scale-105 transition-transform duration-700"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {post.category && (
                        <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
                          <span style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', background: 'rgba(252,249,248,0.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8c0f37' }}>
                            {post.category}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '11px', fontWeight: 600, color: '#584144', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {(post.publishedAt || post.scheduledAt) && (
                        <span>{formatDate(post.publishedAt ?? post.scheduledAt ?? null)}</span>
                      )}
                      {(post.publishedAt || post.scheduledAt) && (
                        <span style={{ width: '0.25rem', height: '0.25rem', borderRadius: '50%', background: '#debfc2', flexShrink: 0 }} />
                      )}
                      <span>{estimateReadTime(post.excerpt)}</span>
                      {!img && post.category && (
                        <>
                          <span style={{ width: '0.25rem', height: '0.25rem', borderRadius: '50%', background: '#debfc2', flexShrink: 0 }} />
                          <span>{post.category}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-[#1c1b1b] group-hover:text-[#8c0f37] transition-colors leading-snug">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-[#584144] leading-relaxed line-clamp-2">{post.excerpt}</p>
                    )}
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-[#8c0f37] font-bold text-sm group-hover:gap-3 transition-all"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem' }}
                    >
                      Read More
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            /* Static fallback posts when DB is empty */
            <>
              <article className="group">
                <div style={{ position: 'relative', marginBottom: '1rem', overflow: 'hidden', borderRadius: '0.75rem', background: '#f6f3f2', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined text-[#debfc2] text-5xl">article</span>
                  <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
                    <span style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', background: 'rgba(252,249,248,0.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8c0f37' }}>
                      Industry News
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '11px', fontWeight: 600, color: '#584144', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <span>March 14, 2024</span>
                    <span style={{ width: '0.25rem', height: '0.25rem', borderRadius: '50%', background: '#debfc2' }} />
                    <span>5 min read</span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#1c1b1b] group-hover:text-[#8c0f37] transition-colors leading-snug">
                    Navigating the 2024 Tech Landscape
                  </h3>
                  <p className="text-[#584144] leading-relaxed line-clamp-2">
                    A deep dive into the skills Austin employers are looking for this year.
                  </p>
                  <Link href="/blog" className="text-[#8c0f37] font-bold text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem' }}>
                    Read More
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                </div>
              </article>

              <article style={{ padding: '1.5rem', borderRadius: '0.75rem', background: '#f6f3f2', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7b5800]">Success Stories</span>
                  <h3 className="text-2xl font-bold tracking-tight text-[#1c1b1b]">
                    Member Spotlight: Career Transformation in 6 Months
                  </h3>
                  <p className="text-[#584144] leading-relaxed">
                    How one member transitioned from retail to a technical career with free WorkforceAP training.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem' }}>
                    <span className="text-[11px] font-bold text-[#584144]/60 uppercase">4 min read</span>
                    <Link href="/blog" style={{ height: '2.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', color: '#8c0f37', fontWeight: 700, fontSize: '0.875rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      Read More
                    </Link>
                  </div>
                </div>
              </article>

              <article className="group">
                <div style={{ position: 'relative', marginBottom: '1rem', overflow: 'hidden', borderRadius: '0.75rem', background: '#f6f3f2', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined text-[#debfc2] text-5xl">work</span>
                  <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
                    <span style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', background: 'rgba(252,249,248,0.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8c0f37' }}>
                      Career Tips
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '11px', fontWeight: 600, color: '#584144', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <span>March 08, 2024</span>
                    <span style={{ width: '0.25rem', height: '0.25rem', borderRadius: '50%', background: '#debfc2' }} />
                    <span>7 min read</span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#1c1b1b] group-hover:text-[#8c0f37] transition-colors leading-snug">
                    Mastering the Behavioral Interview
                  </h3>
                  <p className="text-[#584144] leading-relaxed line-clamp-2">
                    Struggling with the STAR method? Here is how to nail your next interview.
                  </p>
                  <Link href="/blog" className="text-[#8c0f37] font-bold text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem' }}>
                    Read More
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                </div>
              </article>
            </>
          )}
        </div>
      </div>

      {/* Newsletter Section */}
      <div style={{ marginTop: '4rem', marginLeft: 0, paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '3rem', paddingBottom: '3rem', background: '#f6f3f2', borderRadius: '1.5rem 1.5rem 0 0' }}>
        <h4 className="text-xl font-bold text-[#1c1b1b]" style={{ marginBottom: '0.5rem' }}>Weekly Workforce Insight</h4>
        <p className="text-[#584144] text-sm" style={{ marginBottom: '1.5rem' }}>
          Get career tips, program updates, and workforce insights delivered to your inbox.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            className="focus:ring-2 focus:ring-[#8c0f37]/20 transition-all"
            style={{ width: '100%', background: 'white', border: 'none', borderRadius: '0.75rem', height: '3rem', paddingLeft: '1rem', paddingRight: '1rem', fontSize: '0.875rem', boxSizing: 'border-box' }}
            placeholder="email@example.com"
            type="email"
          />
          <button
            className="active:scale-95"
            style={{ width: '100%', background: '#ad2c4d', color: 'white', height: '3rem', borderRadius: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Subscribe
          </button>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
