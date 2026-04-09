import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { withCsvBranding } from '@/lib/export/brandingHeader';

export async function GET() {
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

  const csv = withCsvBranding(rows, 'My Certificates', `${certs.length} certificate${certs.length !== 1 ? 's' : ''} on file`);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="workforceap-certificates.csv"',
    },
  });
}
