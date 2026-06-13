import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';

export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { await requireAdmin(user.id); } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const templates = await prisma.$transaction((tx) => tx.emailTemplate.findMany({
      orderBy: { name: 'asc' },
    }));

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('/admin/email-templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
