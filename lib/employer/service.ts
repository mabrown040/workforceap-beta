import { prisma } from '@/lib/db/prisma';
import { tryCurrentRequestHeaders } from '@/lib/tenant/currentRequestHeaders';
import type { HeadersLike } from '@/lib/tenant/resolveOrgFromRequest';
import { resolveProvisionOrganizationId } from '@/lib/tenant/resolveProvisionOrg';
import { EmployerSignupInput } from '@/lib/validation/employer';

export type CreateEmployerUserOptions = {
  organizationId?: string | null;
  headers?: HeadersLike;
};

export async function createEmployerUser(
  userId: string,
  data: EmployerSignupInput,
  options: CreateEmployerUserOptions = {},
): Promise<void> {
  const organizationId = await resolveProvisionOrganizationId({
    explicitOrganizationId: options.organizationId,
    headers: options.headers ?? (await tryCurrentRequestHeaders()),
  });

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
        hearAbout: data.hearAbout || null,
        status: 'pending_approval',
        tier: 'basic',
        hiringPipelineActive: false,
        placementAgreementSigned: false,
      },
    });
  });
}
