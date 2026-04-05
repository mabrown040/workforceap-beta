import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const certs = await prisma.userCertification.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: 'desc' },
      select: { certName: true, earnedAt: true },
    });

    const rows = [
      'Certificate Name,Earned Date',
      ...certs.map((c) => `"${c.certName}","${c.earnedAt.toISOString().split('T')[0]}"`)
    ].join('\n');

    return new NextResponse(rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="my-certificates.csv"',
      },
    });
  } catch (error) {
    console.error('[api/member/certifications/export] unexpected error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
