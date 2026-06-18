import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const post = await prisma.$transaction((tx) => tx.blogPost.findUnique({ where: { id: id } }));
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(post);
  } catch (error) {
    console.error('[admin/blog/[id] GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);

async function _PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
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
      scheduledAt,
    } = body;

    const existing = await prisma.$transaction((tx) => tx.blogPost.findUnique({ where: { id: id } }));
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (slug?.trim() && slug !== existing.slug) {
      const dup = await prisma.$transaction((tx) => tx.blogPost.findFirst({
        where: { slug: slug.trim(), NOT: { id: id } },
      }));
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

    const post = await prisma.$transaction((tx) => tx.blogPost.update({
      where: { id: id },
      data: update,
    }));

    return NextResponse.json(post);
  } catch (error) {
    console.error('[admin/blog/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);

async function _DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const existing = await prisma.$transaction((tx) => tx.blogPost.findUnique({ where: { id: id } }));
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await prisma.$transaction((tx) => tx.blogPost.delete({ where: { id: id } }));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/blog/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);
