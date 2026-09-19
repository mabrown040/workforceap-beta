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
import { logAuditEvent } from '@/lib/audit/log';
export const POST = withApiGuc(async (request: NextRequest) => {
  try {
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

    if (!slug?.trim() || !title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'Slug, title, and content are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.$transaction((tx) => tx.blogPost.findUnique({ where: { slug: slug.trim() } }));
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    const post = await prisma.$transaction((tx) => tx.blogPost.create({
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
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    }));

    void auditLog({ actorUserId: user.id, action: 'admin_blog_post_created', targetType: 'User', targetId: user.id, metadata: { postId: post.id, slug: post.slug } }).catch(() => {});
    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'BlogPost', id: post.id }, result: { success: true, extensions: { slug: post.slug } } }).catch(() => {});
    return NextResponse.json(post);
  } catch (error) {
    console.error('[admin/blog POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
