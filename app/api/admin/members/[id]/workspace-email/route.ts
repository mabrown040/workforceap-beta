import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';
import { getWorkspaceEmailProvider } from '@/lib/workspace-email/provider';

const provisionBody = z.object({
  requestedLocalPart: z.string().trim().min(1).max(64).optional(),
});

type Props = { params: Promise<{ id: string }> };

async function loadMemberOr404(memberId: string) {
  return prisma.user.findFirst({
    where: { id: memberId, deletedAt: null },
    select: {
      id: true,
      email: true,
      fullName: true,
      workspaceEmail: true,
      workspaceEmailProvisioned: true,
    },
  });
}

export async function POST(request: NextRequest, { params }: Props) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;
  const member = await loadMemberOr404(memberId);
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

  await prisma.user.update({
    where: { id: memberId },
    data: {
      workspaceEmail: result.workspaceEmail,
      workspaceEmailProvisioned: true,
    },
  });

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
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;
  const member = await loadMemberOr404(memberId);
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

  await prisma.user.update({
    where: { id: memberId },
    data: {
      workspaceEmail: null,
      workspaceEmailProvisioned: false,
    },
  });

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
}
