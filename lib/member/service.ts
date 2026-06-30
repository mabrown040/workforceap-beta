import { prisma } from '@/lib/db/prisma';
import { ApplicationStatus } from '@prisma/client';
import { sendNewApplicationAdminEmail } from '@/lib/email';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { MemberSignupInput } from '@/lib/validation/member';
import { withDbRetry } from '@/lib/db/withDbRetry';

/**
 * The member row uses the Supabase auth user id as its primary key, so the
 * whole insert below is one atomic $transaction. If a transient pooler failure
 * (2026-06-30 incident) drops the connection *after* the transaction committed
 * but before Prisma sees the ack, a naive retry would hit a duplicate-PK error
 * and the caller would delete the auth user — orphaning the committed rows.
 * Treat "the user row already exists" as success instead.
 */
async function memberAlreadyCreated(userId: string): Promise<boolean> {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return existing !== null;
  } catch {
    return false;
  }
}

export async function createMember(
  userId: string,
  data: MemberSignupInput
): Promise<void> {
  let referralPartnerId: string | null = null;
  let referralSource: string | null = null;

  const refRaw = data.referralRef?.trim().toLowerCase();
  if (refRaw) {
    const partner = await withDbRetry(() =>
      prisma.partner.findFirst({
        where: {
          active: true,
          OR: [{ referralCode: refRaw }, { slug: refRaw }],
        },
        select: { id: true },
      }),
    );
    if (partner) {
      referralPartnerId = partner.id;
      referralSource = `partner_ref:${refRaw}`;
    }
  }

  const organizationId = await withDbRetry(() => getDefaultOrganizationId());

  await withDbRetry(async () => {
    try {
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
    } catch (err) {
      // The transaction is atomic, so a transient connectivity failure rolls it
      // back and a retry re-creates the rows cleanly. The one exception is a
      // commit whose ack was lost to a dropped connection: the rows ARE there,
      // so a retry would throw duplicate-PK. If the user row exists, the signup
      // already succeeded — return instead of failing or duplicating.
      if (await memberAlreadyCreated(userId)) return;
      throw err;
    }
  });
}
