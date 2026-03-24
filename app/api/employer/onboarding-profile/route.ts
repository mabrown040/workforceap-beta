import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  companyName: z.string().min(1).max(200),
  industry: z.string().max(100).optional().nullable(),
  companySize: z.string().max(50).optional().nullable(),
  companyWebsite: z.string().url().max(500).optional().nullable().or(z.literal('')),
});

export async function PATCH(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const { companyName, industry, companySize, companyWebsite } = parsed.data;
  const website = companyWebsite?.trim() || null;

  await prisma.employer.update({
    where: { id: ctx.employerId },
    data: {
      companyName: companyName.trim(),
      industry: industry?.trim() || null,
      companySize: companySize?.trim() || null,
      companyWebsite: website,
    },
  });

  return NextResponse.json({ ok: true });
}
