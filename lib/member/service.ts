import { prisma } from '@/lib/db/prisma';
import { ApplicationStatus } from '@prisma/client';
import { sendNewApplicationAdminEmail } from '@/lib/email';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { MemberSignupInput } from '@/lib/validation/member';

export async function createMember(
  userId: string,
  data: MemberSignupInput
): Promise<void> {
  let referralPartnerId: string | null = null;
  let referralSource: string | null = null;

  const refRaw = data.referralRef?.trim().toLowerCase();
  if (refRaw) {
    const partner = await prisma.partner.findFirst({
      where: {
        active: true,
        OR: [{ referralCode: refRaw }, { slug: refRaw }],
      },
      select: { id: true },
    });
    if (partner) {
      referralPartnerId = partner.id;
      referralSource = `partner_ref:${refRaw}`;
    }
  }

  const organizationId = await getDefaultOrganizationId();

  await prisma.$transaction(async (tx) => {
    let memberRole = await tx.role.findUnique({ where: { name: 'member' } });
    if (!memberRole) {
      memberRole = await tx.role.create({ data: { name: 'member' } });
    }

    await tx.user.create({
      data: {
        id: userId,
        organizationId,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
      },
    });

    await tx.userRole.create({
      data: { userId, roleId: memberRole.id },
    });

    await tx.profile.create({
      data: {
        userId,
        zip: data.zip,
        veteranStatus: data.veteranStatus ?? undefined,
        employmentStatus: data.employmentStatus ?? undefined,
        consentTerms: data.consentTerms,
        consentCommunications: data.consentCommunications ?? false,
      },
    });

    const app = await tx.application.create({
      data: {
        userId,
        status: ApplicationStatus.PENDING,
        programInterest: data.programInterest,
        submittedAt: new Date(),
        referralSource,
        referralPartnerId,
      },
    });

    // Best-effort: notify admins of new application (do not block signup)
    sendNewApplicationAdminEmail({
      applicantName: data.fullName,
      applicantEmail: data.email,
      programInterest: data.programInterest,
      applicationId: app.id,
    }).catch((err) => console.error('New application admin email failed:', err));
  });
}
