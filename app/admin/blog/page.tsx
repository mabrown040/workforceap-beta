import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { buildPageMetadata } from '@/app/seo';
import BlogPostActions from '@/components/admin/BlogPostActions';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Blog Posts',
  description: 'Manage blog content.',
  path: '/admin/blog',
});

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  published: { bg: 'rgba(74,155,79,0.12)', color: 'var(--color-green, #4a9b4f)' },
  scheduled: { bg: 'rgba(37,99,235,0.1)', color: '#2563eb' },
  draft: { bg: 'var(--surface-container-high)', color: 'var(--color-on-surface-variant)' },
};

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
    <div>
      <PageHeader
        title="Blog Posts"
        subtitle={`${posts.length} post${posts.length !== 1 ? 's' : ''}`}
        action={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/admin/blog/ai" className="btn btn-outline btn-sm">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              AI Assistant
            </Link>
            <Link href="/admin/blog/new" className="btn btn-primary btn-sm">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
              New Post
            </Link>
          </div>
        }
      />

      {posts.length === 0 ? (
        <div className="admin-empty-state">
          <h3>No blog posts yet</h3>
          <p>Create your first post to start publishing content.</p>
          <Link href="/admin/blog/new" className="btn btn-primary">New Post</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {posts.map((post) => {
            const statusKey = post.published ? 'published' : post.scheduledAt ? 'scheduled' : 'draft';
            const statusLabel = post.published ? 'Published' : post.scheduledAt ? 'Scheduled' : 'Draft';
            const sc = STATUS_COLOR[statusKey];
            const updatedLabel = post.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const publishLabel = post.publishedAt
              ? post.publishedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : post.scheduledAt
              ? post.scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null;

            return (
              <div key={post.id} className="portal-card portal-card--flat" style={{ padding: '1rem 1.125rem', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  {/* Post type icon */}
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>article</span>
                  </div>

                  {/* Title + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: 0, lineHeight: 1.3 }}>
                        {post.title}
                      </p>
                      <span style={{ fontSize: '0.625rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '9999px', background: sc.bg, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                        {statusLabel}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                      {post.category && <span style={{ fontWeight: 600 }}>{post.category}</span>}
                      {post.category && <span>·</span>}
                      {publishLabel && <span>{statusKey === 'scheduled' ? `Scheduled ${publishLabel}` : `Published ${publishLabel}`}</span>}
                      <span>Updated {updatedLabel}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <Link
                      href={`/admin/blog/${post.id}/edit`}
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>edit</span>
                      Edit
                    </Link>
                    <Link
                      href={`/admin/blog/preview/${post.slug}`}
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>visibility</span>
                      Preview
                    </Link>
                    <BlogPostActions id={post.id} slug={post.slug} published={post.published} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
