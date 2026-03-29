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
    <div className="md:hidden bg-[#fcf9f8] min-h-screen pb-32">
      {/* Header */}
      <div className="px-6 pt-8 mb-8">
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8c0f37] mb-2 block">
          Perspective
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1c1b1b] leading-tight mb-3">
          Blog and Updates
        </h1>
        <p className="text-[#584144] text-lg leading-relaxed font-medium">
          Stories, announcements, and career insights.
        </p>
      </div>

      {/* Category Filter Chips */}
      <div className="mb-8 -mx-0 overflow-x-hidden">
        <div className="flex overflow-x-auto px-6 gap-3 pb-2 scroll-smooth no-scrollbar" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setFilter(null)}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              filter === null
                ? 'bg-[#8c0f37] text-white'
                : 'bg-[#ebe7e7] text-[#584144]'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                filter === cat
                  ? 'bg-[#8c0f37] text-white'
                  : 'bg-[#ebe7e7] text-[#584144]'
              }`}
            >
              {cat}
            </button>
          ))}
          {/* Static fallback chips if no categories from DB */}
          {categories.length === 0 && (
            <>
              <button className="whitespace-nowrap px-5 py-2 rounded-full bg-[#ebe7e7] text-[#584144] text-sm font-semibold">Career Tips</button>
              <button className="whitespace-nowrap px-5 py-2 rounded-full bg-[#ebe7e7] text-[#584144] text-sm font-semibold">Program Updates</button>
              <button className="whitespace-nowrap px-5 py-2 rounded-full bg-[#ebe7e7] text-[#584144] text-sm font-semibold">Success Stories</button>
              <button className="whitespace-nowrap px-5 py-2 rounded-full bg-[#ebe7e7] text-[#584144] text-sm font-semibold">Industry News</button>
            </>
          )}
        </div>
      </div>

      {/* Blog Post Card List */}
      <div className="px-6 space-y-10">
        {filtered.length > 0 ? (
          filtered.map((post) => {
            const img = post.coverImage || post.heroImage;
            return (
              <article key={post.id} className="group">
                {img && (
                  <div className="relative mb-4 overflow-hidden rounded-xl bg-[#f6f3f2] aspect-[4/3]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {post.category && (
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-[#fcf9f8]/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-[#8c0f37]">
                          {post.category}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[#584144] uppercase tracking-widest">
                    {(post.publishedAt || post.scheduledAt) && (
                      <span>{formatDate(post.publishedAt ?? post.scheduledAt ?? null)}</span>
                    )}
                    {(post.publishedAt || post.scheduledAt) && (
                      <span className="w-1 h-1 rounded-full bg-[#debfc2]" />
                    )}
                    <span>{estimateReadTime(post.excerpt)}</span>
                    {!img && post.category && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-[#debfc2]" />
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
                    className="inline-flex items-center gap-2 text-[#8c0f37] font-bold text-sm pt-1 group-hover:gap-3 transition-all"
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
              <div className="relative mb-4 overflow-hidden rounded-xl bg-[#f6f3f2] aspect-[4/3] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#debfc2] text-5xl">article</span>
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-[#fcf9f8]/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-[#8c0f37]">
                    Industry News
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#584144] uppercase tracking-widest">
                  <span>March 14, 2024</span>
                  <span className="w-1 h-1 rounded-full bg-[#debfc2]" />
                  <span>5 min read</span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-[#1c1b1b] group-hover:text-[#8c0f37] transition-colors leading-snug">
                  Navigating the 2024 Tech Landscape
                </h3>
                <p className="text-[#584144] leading-relaxed line-clamp-2">
                  A deep dive into the skills Austin employers are looking for this year.
                </p>
                <Link href="/blog" className="inline-flex items-center gap-2 text-[#8c0f37] font-bold text-sm pt-1">
                  Read More
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            </article>

            <article className="p-6 rounded-xl bg-[#f6f3f2] relative overflow-hidden">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7b5800]">Success Stories</span>
                <h3 className="text-2xl font-bold tracking-tight text-[#1c1b1b]">
                  Member Spotlight: Career Transformation in 6 Months
                </h3>
                <p className="text-[#584144] leading-relaxed">
                  How one member transitioned from retail to a technical career with free WorkforceAP training.
                </p>
                <div className="flex items-center justify-between pt-3">
                  <span className="text-[11px] font-bold text-[#584144]/60 uppercase">4 min read</span>
                  <Link href="/blog" className="h-10 px-6 flex items-center justify-center bg-white text-[#8c0f37] font-bold text-sm rounded-lg shadow-sm">
                    Read More
                  </Link>
                </div>
              </div>
            </article>

            <article className="group">
              <div className="relative mb-4 overflow-hidden rounded-xl bg-[#f6f3f2] aspect-[4/3] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#debfc2] text-5xl">work</span>
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-[#fcf9f8]/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-[#8c0f37]">
                    Career Tips
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#584144] uppercase tracking-widest">
                  <span>March 08, 2024</span>
                  <span className="w-1 h-1 rounded-full bg-[#debfc2]" />
                  <span>7 min read</span>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-[#1c1b1b] group-hover:text-[#8c0f37] transition-colors leading-snug">
                  Mastering the Behavioral Interview
                </h3>
                <p className="text-[#584144] leading-relaxed line-clamp-2">
                  Struggling with the STAR method? Here is how to nail your next interview.
                </p>
                <Link href="/blog" className="inline-flex items-center gap-2 text-[#8c0f37] font-bold text-sm pt-1">
                  Read More
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            </article>
          </>
        )}
      </div>

      {/* Newsletter Section */}
      <div className="mt-16 mx-0 px-6 py-12 bg-[#f6f3f2] rounded-t-3xl">
        <h4 className="text-xl font-bold mb-2 text-[#1c1b1b]">Weekly Workforce Insight</h4>
        <p className="text-[#584144] text-sm mb-6">
          Get career tips, program updates, and workforce insights delivered to your inbox.
        </p>
        <div className="flex flex-col gap-3">
          <input
            className="w-full bg-white border-none rounded-xl h-12 px-4 text-sm focus:ring-2 focus:ring-[#8c0f37]/20 transition-all"
            placeholder="email@example.com"
            type="email"
          />
          <button className="w-full bg-[#ad2c4d] text-white h-12 rounded-xl font-bold transition-all active:scale-95">
            Subscribe
          </button>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
