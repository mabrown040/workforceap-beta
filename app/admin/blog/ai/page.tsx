import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { isAIConfigured } from '@/lib/ai/groq';
import { isWebSearchConfigured } from '@/lib/ai/blogAI';
import BlogAIClient from './BlogAIClient';

export default async function AdminBlogAIPage() {
  const hasAI = isAIConfigured();
  const hasWebSearch = isWebSearchConfigured();
  const postCount = await prisma.blogPost.count({ where: { published: true } });

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link
        href="/admin/blog"
        style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}
      >
        ← Back to Blog
      </Link>
      <h1 style={{ marginBottom: '0.5rem' }}>Blog AI Tools</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Suggest topics, draft posts, and review content. {hasWebSearch && 'Web search enabled for current info.'}
      </p>
      {!hasAI ? (
        <div
          style={{
            padding: '1rem',
            background: '#fef3c7',
            borderRadius: '6px',
            color: '#92400e',
          }}
        >
          GROQ_API_KEY not configured. Set it in your environment to use AI tools.
        </div>
      ) : (
        <BlogAIClient postCount={postCount} />
      )}
    </div>
  );
}
