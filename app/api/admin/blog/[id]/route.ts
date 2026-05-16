import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withApiGuc } from '@/lib/db/withRequestGuc';async function _GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    // BlogPost has organizationId — scope reads + writes so an Org A
    // admin cannot read, edit, or delete an Org B blog post.
    const orgId = await getActorOrganizationId(user.id);
    const post = await prisma.blogPost.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(post);
  } catch (error) {
    console.error('[admin/blog/[id] GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const orgId = await getActorOrganizationId(user.id);
    const existing = await prisma.blogPost.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (slug?.trim() && slug !== existing.slug) {
      // Check uniqueness within the same org.
      const dup = await prisma.blogPost.findFirst({
        where: { slug: slug.trim(), organizationId: orgId, NOT: { id } },
      });
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

    // updateMany so the org filter is enforced; update({where:{id}}) would
    // bypass the FK clause.
    await prisma.blogPost.updateMany({
      where: { id, organizationId: orgId },
      data: update,
    });
    const post = await prisma.blogPost.findFirst({
      where: { id, organizationId: orgId },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('[admin/blog/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);async function _DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const orgId = await getActorOrganizationId(user.id);
    const result = await prisma.blogPost.deleteMany({
      where: { id, organizationId: orgId },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/blog/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);
