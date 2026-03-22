import Link from 'next/link';
import { Clock } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import BlogPostActions from '@/components/admin/BlogPostActions';
import PageHeader from '@/components/portal/PageHeader';

export default async function AdminBlogPage() {
  const posts = await prisma.blogPost.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      published: true,
      publishedAt: true,
      scheduledAt: true,
      updatedAt: true,
    },
  });

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <PageHeader
        title="Blog Posts"
        action={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link href="/admin/blog/ai" className="btn btn-outline btn-sm">AI Writing Assistant</Link>
            <Link href="/admin/blog/new" className="btn btn-primary btn-sm">New Post</Link>
          </div>
        }
      />
      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Go live</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td>{post.title}</td>
              <td>{post.category ?? '—'}</td>
              <td>
                <span
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    background: post.published
                      ? 'rgba(173, 44, 77, 0.12)'
                      : post.scheduledAt
                      ? 'rgba(37, 99, 235, 0.1)'
                      : 'var(--color-gray-100)',
                    color: post.published
                      ? 'var(--color-accent)'
                      : post.scheduledAt
                      ? '#2563eb'
                      : 'var(--color-gray-600)',
                  }}
                >
                  {post.published ? 'Published' : post.scheduledAt ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> Scheduled
                    </span>
                  ) : 'Draft'}
                </span>
              </td>
              <td style={{ color: 'var(--color-gray-600)' }}>
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </td>
              <td>
                <BlogPostActions
                  id={post.id}
                  slug={post.slug}
                  published={post.published}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {posts.length === 0 && (
        <div className="admin-empty-state">
          <h3>No blog posts yet</h3>
          <p>Create your first post to start publishing content.</p>
          <Link href="/admin/blog/new" className="btn btn-primary">New Post</Link>
        </div>
      )}
    </div>
  );
}
