import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { withCsvBranding } from '@/lib/export/brandingHeader';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const GET = withApiGuc(async () => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const certs = await prisma.$transaction((tx) => tx.userCertification.findMany({
    where: { userId: user.id },
    orderBy: { earnedAt: 'desc' },
    select: { certName: true, earnedAt: true },
    take: 100,
  }));

  const rows = [
    'Certificate Name,Earned Date',
    ...certs.map((c) => `"${c.certName}","${c.earnedAt.toISOString().split('T')[0]}"`)
  ].join('\n');

  const csv = withCsvBranding(rows, 'My Certificates', `${certs.length} certificate${certs.length !== 1 ? 's' : ''} on file`);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="workforceap-certificates.csv"',
    },
  });

  } catch (error) {
    console.error('/member/certifications/export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

