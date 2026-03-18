import Link from 'next/link';
import BlogPostEditor from '../BlogPostEditor';

export default function AdminBlogNewPage() {
  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link
        href="/admin/blog"
        style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}
      >
        ← Back to Blog
      </Link>
      <h1 style={{ marginBottom: '1.5rem' }}>New Blog Post</h1>
      <BlogPostEditor mode="create" />
    </div>
  );
}
