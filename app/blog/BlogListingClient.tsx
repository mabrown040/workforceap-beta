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
  authorName: string | null;
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

  return (
    <section className="wa-max-w-[1100px] wa-mx-auto wa-py-8 wa-px-0">
      {/* Quick Resources */}
      <div className="wa-grid wa-grid-cols-1 sm:wa-grid-cols-2 wa-gap-3 wa-mb-10">
        <Link
          href="/programs"
          className="wa-flex wa-items-center wa-gap-4 wa-p-5 wa-bg-white/5 wa-border wa-border-white/10 wa-rounded-2xl wa-backdrop-blur wa-no-underline wa-text-gray-900 dark:wa-text-[#e6e1e1] hover:wa-border-[rgba(173,44,77,0.4)] wa-transition-colors"
        >
          <GraduationCap size={28} className="wa-text-[#ad2c4d] wa-shrink-0" />
          <div>
            <div className="wa-font-semibold">Explore Programs</div>
            <div className="wa-text-sm wa-text-gray-500 dark:wa-text-[#a68a8d]">19 career training options</div>
          </div>
          <ArrowRight size={20} className="wa-ml-auto wa-opacity-40" />
        </Link>
        <Link
          href="/faq"
          className="wa-flex wa-items-center wa-gap-4 wa-p-5 wa-bg-white/5 wa-border wa-border-white/10 wa-rounded-2xl wa-backdrop-blur wa-no-underline wa-text-gray-900 dark:wa-text-[#e6e1e1] hover:wa-border-[rgba(173,44,77,0.4)] wa-transition-colors"
        >
          <HelpCircle size={28} className="wa-text-[#ad2c4d] wa-shrink-0" />
          <div>
            <div className="wa-font-semibold">Read FAQ</div>
            <div className="wa-text-sm wa-text-gray-500 dark:wa-text-[#a68a8d]">Common questions answered</div>
          </div>
          <ArrowRight size={20} className="wa-ml-auto wa-opacity-40" />
        </Link>
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="wa-flex wa-flex-wrap wa-gap-2 wa-mb-8">
          <button
            type="button"
            onClick={() => setFilter(null)}
            className={`wa-px-4 wa-py-1.5 wa-rounded-full wa-text-sm wa-font-medium wa-border wa-transition-colors ${
              filter === null
                ? 'wa-border-[#ad2c4d] wa-bg-[rgba(173,44,77,0.12)] wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]'
                : 'wa-border-white/10 wa-bg-transparent dark:wa-text-[#debfc2] hover:wa-border-[rgba(173,44,77,0.3)]'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`wa-px-4 wa-py-1.5 wa-rounded-full wa-text-sm wa-font-medium wa-border wa-transition-colors ${
                filter === cat
                  ? 'wa-border-[#ad2c4d] wa-bg-[rgba(173,44,77,0.12)] wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]'
                  : 'wa-border-white/10 wa-bg-transparent dark:wa-text-[#debfc2] hover:wa-border-[rgba(173,44,77,0.3)]'
              }`}
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
        <p className="wa-text-center dark:wa-text-[#a68a8d] wa-py-12">
          No posts found.
        </p>
      )}

      {/* Bottom CTA */}
      <div className="wa-mt-16 wa-p-10 wa-bg-[rgba(173,44,77,0.08)] wa-border wa-border-[rgba(173,44,77,0.2)] wa-rounded-2xl wa-text-center">
        <BookOpen size={40} className="wa-mx-auto wa-mb-4 wa-text-[#ad2c4d] wa-opacity-80" />
        <h3 className="wa-text-2xl wa-font-bold dark:wa-text-[#e6e1e1] wa-mb-2">
          Want personalized career guidance?
        </h3>
        <p className="dark:wa-text-[#debfc2] wa-mb-6 wa-max-w-md wa-mx-auto">
          Read our blog for tips, or get started finding the right program for your goals.
        </p>
        <div className="wa-flex wa-gap-3 wa-justify-center wa-flex-wrap">
          <Link
            href="/find-your-path"
            className="wa-inline-flex wa-items-center wa-px-6 wa-py-3 wa-bg-gradient-to-r wa-from-[#ad2c4d] wa-to-[#c9364f] wa-text-white wa-rounded-xl wa-font-bold wa-no-underline hover:wa-opacity-90 wa-transition-opacity"
          >
            Take Career Quiz
          </Link>
          <Link
            href="/programs"
            className="wa-inline-flex wa-items-center wa-px-6 wa-py-3 wa-border wa-border-white/20 dark:wa-text-[#e6e1e1] wa-rounded-xl wa-font-semibold wa-no-underline hover:wa-border-white/40 wa-transition-colors"
          >
            Browse Programs
          </Link>
        </div>
      </div>
    </section>
  );
}
