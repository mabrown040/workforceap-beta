import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return 'Rolling';
  try {
    return d.toISOString().slice(0, 10);
  } catch {
    return 'Rolling';
  }
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const organizationId = await getDefaultOrganizationId();
  const rows = await prisma.organizationProgramCatalog.findMany({
    where: { organizationId, status: 'active' },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });

  const header = [
    'Program name',
    'Short description (200 chars)',
    'Duration',
    'Tuition cost',
    'Certification exam cost',
    'Book/materials cost',
    'Miscellaneous fees',
    'Total cost',
    'Start date',
    'End date',
    'Certifications earned',
  ];

  const lines = [header.map(csvEscape).join(',')];

  for (const r of rows) {
    const tuition = r.cost ?? 0;
    const cert = r.certCost ?? 0;
    const book = r.bookCost ?? 0;
    const misc = r.miscCost ?? 0;
    const total = tuition + cert + book + misc;
    const desc = (r.description ?? r.name).slice(0, 200);
    const certs = (r.certifications ?? []).join(', ');

    lines.push(
      [
        r.name,
        desc,
        r.duration ?? '',
        String(tuition),
        String(cert),
        String(book),
        String(misc),
        String(total),
        formatDate(r.programStartDate),
        formatDate(r.programEndDate),
        certs,
      ]
        .map((c) => csvEscape(String(c)))
        .join(',')
    );
  }

  const csv = `${lines.join('\r\n')}\r\n`;
  const filename = `workforceap-twc-program-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
