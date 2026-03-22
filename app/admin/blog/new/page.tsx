import Link from 'next/link';
import { isAIConfigured } from '@/lib/ai/groq';
import BlogPostEditor from '../BlogPostEditor';
import PageHeader from '@/components/portal/PageHeader';

export default function AdminBlogNewPage() {
  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link
        href="/admin/blog"
        style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}
      >
        ← Back to Blog
      </Link>
      <PageHeader title="New Blog Post" />
      <BlogPostEditor mode="create" aiEnabled={isAIConfigured()} />
    </div>
  );
}
