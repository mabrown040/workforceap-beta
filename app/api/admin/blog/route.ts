import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const {
    slug,
    title,
    excerpt,
    content,
    coverImage,
    authorName,
    category,
    published,
  } = body;

  if (!slug?.trim() || !title?.trim() || !content?.trim()) {
    return NextResponse.json(
      { error: 'Slug, title, and content are required' },
      { status: 400 }
    );
  }

  const existing = await prisma.blogPost.findUnique({ where: { slug: slug.trim() } });
  if (existing) {
    return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
  }

  const post = await prisma.blogPost.create({
    data: {
      slug: slug.trim(),
      title: title.trim(),
      excerpt: excerpt?.trim() || null,
      content: content.trim(),
      coverImage: coverImage?.trim() || null,
      authorName: authorName?.trim() || 'WorkforceAP Team',
      category: category?.trim() || null,
      published: !!published,
      publishedAt: published ? new Date() : null,
    },
  });

  return NextResponse.json(post);
}
