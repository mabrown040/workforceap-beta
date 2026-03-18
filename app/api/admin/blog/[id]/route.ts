import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(post);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
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
    scheduledAt,
  } = body;

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (slug?.trim() && slug !== existing.slug) {
    const dup = await prisma.blogPost.findUnique({ where: { slug: slug.trim() } });
    if (dup) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }
  }

  const update: Record<string, unknown> = {};
  if (slug !== undefined) update.slug = slug?.trim() ?? existing.slug;
  if (title !== undefined) update.title = title?.trim() ?? existing.title;
  if (excerpt !== undefined) update.excerpt = excerpt?.trim() || null;
  if (content !== undefined) update.content = content?.trim() ?? existing.content;
  if (coverImage !== undefined) update.coverImage = coverImage?.trim() || null;
  if (authorName !== undefined) update.authorName = authorName?.trim() || 'WorkforceAP Team';
  if (category !== undefined) update.category = category?.trim() || null;
  if (published !== undefined) {
    update.published = !!published;
    update.publishedAt = published ? (existing.publishedAt ?? new Date()) : null;
  }
  if (scheduledAt !== undefined) update.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

  const post = await prisma.blogPost.update({
    where: { id },
    data: update,
  });

  return NextResponse.json(post);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await prisma.blogPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
