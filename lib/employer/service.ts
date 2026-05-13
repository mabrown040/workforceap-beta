import { prisma } from '@/lib/db/prisma';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { EmployerSignupInput } from '@/lib/validation/employer';

export async function createEmployerUser(
  userId: string,
  data: EmployerSignupInput
): Promise<void> {
  const organizationId = await getDefaultOrganizationId();

  await prisma.$transaction(async (tx) => {
    // Create the user row
    await tx.user.create({
      data: {
        id: userId,
        organizationId,
        email: data.email,
        fullName: data.contactName,
        phone: data.phone || null,
      },
    });

    // Create the employer record linked to the user
    await tx.employer.create({
      data: {
        organizationId,
        userId,
        companyName: data.companyName,
        contactName: data.contactName,
        contactEmail: data.email,
        contactPhone: data.phone || null,
        industry: data.industry || null,
        companySize: data.companySize || null,
        companyDescription: data.rolesHiring || null,
        status: 'active',
        tier: 'basic',
        hiringPipelineActive: false,
        placementAgreementSigned: false,
      },
    });
  });
}
