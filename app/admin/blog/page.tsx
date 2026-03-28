import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { buildPageMetadata } from '@/app/seo';
import BlogPostActions from '@/components/admin/BlogPostActions';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Blog Posts',
  description: 'Manage blog content.',
  path: '/admin/blog',
});

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
    <div className="admin-page-content">
      <PageHeader
        title="Blog Posts"
        action={
          <div className="admin-page-header-actions">
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
                <span className={`badge badge-sm ${post.published ? 'badge-accent' : post.scheduledAt ? 'badge-info' : 'badge-neutral'}`}>
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
