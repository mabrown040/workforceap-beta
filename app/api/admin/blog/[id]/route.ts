import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const optionalText = z.string().nullable().optional();

/**
 * Body sent by app/admin/blog/BlogPostEditor and components/admin/BlogPostActions.
 * A body that is not JSON, not an object, or carries non-string fields used to
 * reach `.trim()` / Prisma and surface as a 500.
 */
const blogPostBodySchema = z.object({
  slug: optionalText,
  title: optionalText,
  excerpt: optionalText,
  content: optionalText,
  coverImage: optionalText,
  authorName: optionalText,
  category: optionalText,
  published: z.unknown().optional(),
  scheduledAt: optionalText.refine(
    (value) => !value || !Number.isNaN(new Date(value).getTime()),
    'scheduledAt must be a valid date',
  ),
});
import { auditLog } from '@/lib/audit';

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

    const parsed = blogPostBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid blog post body' },
        { status: 400 },
      );
    }
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
    } = parsed.data;

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

    await auditLog({
      actorUserId: user.id,
      action: 'blog_post_update',
      targetType: 'blog_post',
      targetId: id,
      metadata: { slug: post.slug, title: post.title, published: post.published, changes: Object.keys(update) },
    });

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
    await auditLog({
      actorUserId: user.id,
      action: 'blog_post_delete',
      targetType: 'blog_post',
      targetId: id,
      metadata: { slug: existing.slug, title: existing.title, published: existing.published },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/blog/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);
