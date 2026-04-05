import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { computeMemberSkillProfile } from '@/lib/content/certToSkills';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const certs = await prisma.userCertification.findMany({
      where: { userId: user.id },
      select: { certName: true },
    });

    const certNames = certs.map((c: { certName: string }) => c.certName);
    const skillProfile = computeMemberSkillProfile(certNames);

    return NextResponse.json({ certNames, skillProfile });
  } catch (error) {
    console.error('[api/member/skill-profile] unexpected error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
