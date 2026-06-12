import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';
import { getWorkspaceEmailProvider } from '@/lib/workspace-email/provider';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const provisionBody = z.object({
  requestedLocalPart: z.string().trim().min(1).max(64).optional(),
});

type Props = { params: Promise<{ id: string }> };

// Tenant scope: load only members of the actor's organization. Without
// the org filter, an Org A admin could provision a workspace email for
// an Org B member by guessing their UUID.
async function loadMemberOr404(memberId: string, orgId: string) {
  return prisma.$transaction((tx) => tx.user.findFirst({
    where: { id: memberId, deletedAt: null, organizationId: orgId },
    select: {
      id: true,
      email: true,
      fullName: true,
      workspaceEmail: true,
      workspaceEmailProvisioned: true,
    },
  }));
}async function _POST(request: NextRequest, { params }: Props) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
    const { id: memberId } = await params;
    const orgId = await getActorOrganizationId(user.id);
    const member = await loadMemberOr404(memberId, orgId);
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  
    let body: unknown = {};
    if (request.headers.get('content-length') !== '0') {
      try {
        body = await request.json();
      } catch {
        // tolerate empty/invalid body — requestedLocalPart is optional
        body = {};
      }
    }
  
    const parsed = provisionBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }
  
    let provider;
    try {
      provider = getWorkspaceEmailProvider();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Provider unavailable';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  
    const result = await provider.provision({
      user: member,
      requestedLocalPart: parsed.data.requestedLocalPart,
    });
  
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Provisioning failed' },
        { status: 502 },
      );
    }
  
    await prisma.$transaction((tx) => tx.user.update({
      where: { id: memberId },
      data: {
        workspaceEmail: result.workspaceEmail,
        workspaceEmailProvisioned: true,
      },
    }));
  
    await auditLog({
      actorUserId: user.id,
      action: 'workspace_email_provisioned',
      targetType: 'user',
      targetId: memberId,
      metadata: {
        workspaceEmail: result.workspaceEmail,
        provider: provider.id,
      },
    });
  
    return NextResponse.json({
      ok: true,
      workspaceEmail: result.workspaceEmail,
      provider: provider.id,
    });
  } catch (error) {
    console.error('/admin/members/[id]/workspace-email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);async function _DELETE(_request: NextRequest, { params }: Props) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
    const { id: memberId } = await params;
    const orgId = await getActorOrganizationId(user.id);
    const member = await loadMemberOr404(memberId, orgId);
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  
    let provider;
    try {
      provider = getWorkspaceEmailProvider();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Provider unavailable';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  
    const previousEmail = member.workspaceEmail;
    const result = await provider.revoke({ user: member });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Revoke failed' },
        { status: 502 },
      );
    }
  
    await prisma.$transaction((tx) => tx.user.update({
      where: { id: memberId },
      data: {
        workspaceEmail: null,
        workspaceEmailProvisioned: false,
      },
    }));
  
    await auditLog({
      actorUserId: user.id,
      action: 'workspace_email_revoked',
      targetType: 'user',
      targetId: memberId,
      metadata: {
        previousWorkspaceEmail: previousEmail,
        provider: provider.id,
      },
    });
  
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('/admin/members/[id]/workspace-email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);
