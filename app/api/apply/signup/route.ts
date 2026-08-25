import { NextRequest, NextResponse, after } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieOptions';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { z } from 'zod';
import { checkApplySignupRateLimit, checkSignupEmailRateLimit } from '@/lib/rate-limit';
import { verifyTurnstileResponse } from '@/lib/turnstile/verifyTurnstile';
import { trackEvent } from '@/lib/events/track';
import { getConversionValuePayload } from '@/lib/analytics/conversionValue';
import { ApplicationStatus } from '@prisma/client';
import { resolveProvisionOrganizationId } from '@/lib/tenant/resolveProvisionOrg';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logger } from '@/lib/observability/logger';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { withDbRetry, isConnectionAcquisitionError } from '@/lib/db/withDbRetry';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  normalizePartnerRef,
  PARTNER_REF_COOKIE,
  partnerRefCookieClearOptions,
} from '@/lib/apply/applyReferralCapture';
import {
  buildFundingNotes,
  buildSponsoredSeatWhere,
  isSeatCapReached,
  isSponsorshipActive,
  resolveSponsorshipFundingSource,
  type SponsorshipPartner,
} from '@/lib/partners/sponsorship';

import {
  isSchoolCollectionSignup,
  schoolApplicationNotes,
  schoolProfileBarriers,
} from '@/lib/apply/schoolCollection';
import { normalizeHearAbout, normalizeYesNo } from '@/lib/apply/eligibilityExtendedFields';
import {
  sendApplicationConfirmationEmail,
  sendNewApplicationAdminEmail,
  sendSchoolEnrollmentParentAckEmail,
  sendSchoolEnrollmentPartnerAckEmail,
} from '@/lib/email';

/**
 * Seat-cap signal for the ADMIN alert email only.
 *
 * PRIVACY: this must never reach `Application.notes`. That column is returned
 * verbatim to the member by the self-serve GDPR export
 * (`lib/member/exportData.ts` via `/api/member/export-data`), and telling a
 * student "your school ran out of funded seats, funding pending review" is
 * both alarming and none of their business. The signal reaches staff two
 * other ways: the `logger.warn` below and this line in the admin alert.
 *
 * The student is never blocked — this is the signal an admin uses to decide
 * who covers the seat.
 */
function seatCapNote(partnerName: string): string {
  return `Seat cap reached for ${partnerName} sponsorship — funding pending admin review`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

const applySignupSchema = z.object({
  firstName: z.string().trim().min(1, 'Please enter your first name.').max(100),
  lastName: z.string().trim().min(1, 'Please enter your last name.').max(100),
  email: z.string().trim().email('Please enter a valid email address.'),
  phone: z.string().trim().min(10, 'Please enter a valid phone number with area code.').max(50),
  addressLine1: z.string().trim().max(200).optional().nullable(),
  addressLine2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(50).optional().nullable(),
  zip: z.string().trim().max(20).optional().nullable(),
  smsOptIn: z.boolean().optional().default(false),
  password: z.string().min(8, 'Create a password with at least 8 characters.'),
  /** Primary = [0]; up to 3 preferences in order */
  programRankedSlugs: z.array(z.string().min(1)).min(1).max(3),
  referralRef: z.string().max(100).optional().nullable(),
  recommendedOnetCode: z.string().max(32).optional().nullable(),
  recommendedCareerTitle: z.string().max(200).optional().nullable(),
  careerRecommendationJson: z.any().optional().nullable(),
  needsComputerSupportFollowUp: z.boolean().optional(),
  ageGroup: z.enum(['under_18', '18_24', '25_50', '50_plus']).optional().nullable(),
  gradeLevel: z.string().trim().max(20).optional().nullable(),
  parentGuardianName: z.string().trim().max(200).optional().nullable(),
  parentGuardianEmail: z
    .union([z.string().trim().email(), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  parentGuardianPhone: z.string().trim().max(50).optional().nullable(),
  schoolName: z.string().trim().max(200).optional().nullable(),
  county: z.string().trim().max(100).optional().nullable(),
  primaryBarrier: z.string().trim().max(100).optional().nullable(),
  primaryBarriers: z.array(z.string().trim().max(100)).max(20).optional().nullable(),
  eligibilityQualifies: z.boolean().optional().nullable(),
  eligibilityYesCount: z.number().int().min(0).max(3).optional().nullable(),
  eligibilityQ1: z.enum(['yes', 'no']).optional().nullable(),
  eligibilityQ2: z.enum(['yes', 'no']).optional().nullable(),
  eligibilityQ3: z.enum(['yes', 'no']).optional().nullable(),
  receivingUnemployment: z.enum(['yes', 'no']).optional().nullable(),
  exhaustedUnemployment: z.enum(['yes', 'no']).optional().nullable(),
  layoffCompany: z.string().trim().max(200).optional().nullable(),
  snapWic: z.enum(['yes', 'no']).optional().nullable(),
  hearAbout: z.string().trim().max(200).optional().nullable(),
  hearAboutOther: z.string().trim().max(200).optional().nullable(),
  partnerAmbassadorReferral: z.string().trim().max(200).optional().nullable(),
  // Marketing attribution captured at first ad-landing visit. Stored on
  // the apply_signup_completed MemberEvent metadata so downstream analytics
  // (GA4, BigQuery, internal cohort queries) can attribute conversion to
  // a paid campaign or organic referrer.
  utmSource: z.string().max(200).optional().nullable(),
  utmMedium: z.string().max(200).optional().nullable(),
  utmCampaign: z.string().max(200).optional().nullable(),
  utmContent: z.string().max(200).optional().nullable(),
  utmTerm: z.string().max(200).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
  /** Cloudflare Turnstile token, verified server-side when NEXT_PUBLIC_CAPTCHA_ENABLED=true. */
  turnstileToken: z.string().optional().nullable(),
});

export const POST = withApiGuc(async (request: NextRequest) => {
  try {
    const ip = getClientIp(request);
    const { success: rateOk } = await checkApplySignupRateLimit(ip);
    if (!rateOk) {
      return NextResponse.json(
        { error: 'We received a lot of signup attempts from this connection in a short window. Please wait a moment and try again.' },
        { status: 429 }
      );
    }
  
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'We could not read your signup details. Please refresh the page and try again.' }, { status: 400 });
    }
  
    const parsed = applySignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Please review your information and try again.' }, { status: 400 });
    }
  
    const {
      firstName,
      lastName,
      email,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      smsOptIn,
      password,
      programRankedSlugs,
      referralRef,
      recommendedOnetCode,
      recommendedCareerTitle,
      careerRecommendationJson,
      needsComputerSupportFollowUp,
      ageGroup,
      gradeLevel,
      parentGuardianName,
      parentGuardianEmail,
      parentGuardianPhone,
      schoolName,
      county,
      primaryBarrier,
      primaryBarriers,
      eligibilityQualifies,
      eligibilityYesCount,
      eligibilityQ1,
      eligibilityQ2,
      eligibilityQ3,
      receivingUnemployment,
      exhaustedUnemployment,
      layoffCompany,
      snapWic,
      hearAbout,
      hearAboutOther,
      partnerAmbassadorReferral,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      referrer,
      turnstileToken,
    } = parsed.data;

    // Per-email rate limit (3/hr). The per-IP limit above lets an
    // attacker rotating IPs spam verification mail to the same target.
    const { success: emailRateOk } = await checkSignupEmailRateLimit(email);
    if (!emailRateOk) {
      return NextResponse.json(
        { error: 'Too many signup attempts for this email. Please try again later.' },
        { status: 429 }
      );
    }

    const captchaEnabled = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === 'true';
    if (captchaEnabled) {
      const secret = process.env.TURNSTILE_SECRET_KEY;
      if (!secret?.trim()) {
        console.error('TURNSTILE_SECRET_KEY missing while NEXT_PUBLIC_CAPTCHA_ENABLED=true');
        return NextResponse.json(
          { error: 'Signup is temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
      // Clients only render the Turnstile widget when the SITE key is set, so
      // 'enabled + missing site key' means no request can ever carry a token —
      // fail closed as a config error, not an unpassable 400.
      if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()) {
        console.error('NEXT_PUBLIC_TURNSTILE_SITE_KEY missing while NEXT_PUBLIC_CAPTCHA_ENABLED=true');
        return NextResponse.json(
          { error: 'Signup is temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
      const tok = turnstileToken?.trim() ?? '';
      if (!tok) {
        return NextResponse.json({ error: 'Please complete the security check.' }, { status: 400 });
      }
      const ok = await verifyTurnstileResponse(secret, tok, ip !== 'unknown' ? ip : undefined);
      if (!ok) {
        return NextResponse.json({ error: 'Security check failed. Please try again.' }, { status: 400 });
      }
    }

    const profileAddressParts = [addressLine1?.trim(), addressLine2?.trim()].filter(Boolean) as string[];
    const profileAddress = profileAddressParts.length > 0 ? profileAddressParts.join(', ') : null;
  
    const programSlug = programRankedSlugs[0];
    const program = getProgramBySlug(programSlug);
    if (!program) {
      return NextResponse.json({ error: 'We could not match that program choice. Please go back and choose your program again.' }, { status: 400 });
    }
    const secondaryTitles = programRankedSlugs
      .slice(1)
      .map((s) => getProgramBySlug(s)?.title)
      .filter(Boolean) as string[];
    const programInterestSummary =
      secondaryTitles.length > 0 ? `${program.title} (preferences: ${secondaryTitles.join(', ')})` : program.title;
    const rawBarriers =
      primaryBarriers && primaryBarriers.length > 0
        ? primaryBarriers
        : primaryBarrier
          ? [primaryBarrier]
          : [];
    let profileBarrierTypes = rawBarriers.map((b) => b.trim()).filter((b) => b && b !== 'none');
    const hearAboutNormalized = normalizeHearAbout(hearAbout);
    const hearAboutOtherNormalized = normalizeHearAbout(hearAboutOther);
    const receivingUnemploymentNormalized = normalizeYesNo(receivingUnemployment);
    const exhaustedUnemploymentNormalized = normalizeYesNo(exhaustedUnemployment);
    const snapWicNormalized = normalizeYesNo(snapWic);
    const layoffCompanyNormalized = layoffCompany?.trim() ? layoffCompany.trim().slice(0, 200) : null;
    const partnerAmbassadorNormalized = partnerAmbassadorReferral?.trim()
      ? partnerAmbassadorReferral.trim().slice(0, 200)
      : null;

    let applicationNotes = [
      ageGroup ? `Age group: ${ageGroup}` : null,
      city?.trim() ? `City: ${city.trim()}` : null,
      state?.trim() ? `State: ${state.trim()}` : null,
      zip?.trim() ? `ZIP: ${zip.trim()}` : null,
      county?.trim() ? `County: ${county.trim()}` : null,
      profileBarrierTypes.length > 0 ? `Primary barrier(s): ${profileBarrierTypes.join(', ')}` : null,
      typeof eligibilityQualifies === 'boolean' ? `Quick eligibility fit: ${eligibilityQualifies ? 'yes' : 'review'} (${eligibilityYesCount ?? 0}/3)` : null,
      receivingUnemploymentNormalized ? `Receiving unemployment: ${receivingUnemploymentNormalized}` : null,
      exhaustedUnemploymentNormalized ? `Exhausted unemployment: ${exhaustedUnemploymentNormalized}` : null,
      layoffCompanyNormalized ? `Layoff / last employer: ${layoffCompanyNormalized}` : null,
      snapWicNormalized ? `SNAP/WIC: ${snapWicNormalized}` : null,
      hearAboutNormalized ? `Heard about us: ${hearAboutNormalized}` : null,
      hearAboutOtherNormalized ? `Heard about us (other): ${hearAboutOtherNormalized}` : null,
      partnerAmbassadorNormalized ? `Partner/ambassador referral: ${partnerAmbassadorNormalized}` : null,
    ].filter(Boolean).join('\n');
    let hasEmploymentBarrier = profileBarrierTypes.length > 0;
  
    const cookieStore = await cookies();

    let referralPartnerId: string | null = null;
    let referralSource: string | null = null;
    /**
     * Set only when the resolved partner sponsors enrollment AND today falls
     * inside its sponsorship window. Everything sponsorship-related below is
     * gated on this being non-null, so traffic with no ref — or a ref to a
     * partner that does not sponsor — behaves exactly as it did before.
     */
    let sponsorPartner:
      | (SponsorshipPartner & { partnerType: string; schoolDistrict: string | null })
      | null = null;
    let referralPartnerType: string | null = null;
    let referralPartnerName: string | null = null;
    let referralPartnerContactEmail: string | null = null;
    let referralPartnerNotifyOnEnrollment = true;
    const refFromBody = referralRef?.trim();
    const rawRefCookie = cookieStore.get(PARTNER_REF_COOKIE)?.value;
    const refFromCookie = normalizePartnerRef(rawRefCookie);
    const hasPartnerRefCookie = rawRefCookie !== undefined;
    const refRaw = (refFromBody || refFromCookie || '').toLowerCase() || undefined;
    const organizationId = await withDbRetry(() =>
      resolveProvisionOrganizationId({
        headers: request.headers,
        programSlug,
      }),
    );

    if (refRaw) {
      const partner = await withDbRetry(() => prisma.$transaction((tx) => tx.partner.findFirst({
        where: {
          active: true,
          organizationId,
          OR: [{ referralCode: refRaw }, { slug: refRaw }],
        },
        select: {
          id: true,
          name: true,
          partnerType: true,
          contactEmail: true,
          notifyOnEnrollment: true,
          sponsoredEnrollment: true,
          sponsorshipFundingSource: true,
          sponsorshipTermLabel: true,
          sponsorshipStartsAt: true,
          sponsorshipEndsAt: true,
          sponsorshipNotes: true,
          sponsorshipSeatCap: true,
          schoolDistrict: true,
        },
      })));
      if (partner) {
        referralPartnerId = partner.id;
        referralPartnerType = partner.partnerType;
        referralPartnerName = partner.name;
        referralPartnerContactEmail = partner.contactEmail?.trim() || null;
        referralPartnerNotifyOnEnrollment = partner.notifyOnEnrollment;
        referralSource = `partner_ref:${refRaw}`;
        if (isSponsorshipActive(partner, new Date())) {
          sponsorPartner = partner;
        }
      }
    }

    const isSchoolSignup = isSchoolCollectionSignup({
      partnerType: referralPartnerType,
      gradeLevel,
      primaryBarriers: rawBarriers,
    });
    if (isSchoolSignup) {
      const schoolBarriers = schoolProfileBarriers();
      profileBarrierTypes = schoolBarriers.barrierTypes;
      hasEmploymentBarrier = schoolBarriers.hasEmploymentBarrier;
      applicationNotes = schoolApplicationNotes({
        ageGroup,
        gradeLevel,
        schoolName: schoolName?.trim() || referralPartnerName,
        city,
        state,
        zip,
        parentGuardianName,
        parentGuardianEmail,
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Our signup service is temporarily unavailable. Please try again shortly.' }, { status: 500 });
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, (options ?? {}) as Record<string, unknown>);
          });
        },
      },
    });
  
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
      },
    });
  
    if (authError) {
      if (authError.message.includes('already registered') || authError.code === 'user_already_exists') {
        return NextResponse.json(
          { error: 'An account with this email already exists. Log in to continue, or use password reset if you are returning.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'We could not create your account just yet. Please try again in a moment.' }, { status: 400 });
    }
  
    const user = authData.user;
    if (!user) {
      return NextResponse.json({ error: 'Your account could not be created. Please try again.' }, { status: 500 });
    }

    const priorUser = await withDbRetry(() => prisma.$transaction((tx) => tx.user.findUnique({
      where: { id: user.id },
      select: { enrolledAt: true },
    })));

    let createdApplicationId: string | null = null;
    /**
     * Set inside the transaction when the sponsoring partner has no funded
     * seats left. Soft cap: the student still enrolls, we just skip the
     * funding stamp and flag the application so an admin can sort funding out.
     * Assigned (never appended to) so a transaction retry stays idempotent.
     */
    let sponsorshipSeatCapReached = false;
    try {
      // Retry only on connection-acquisition failures (nothing committed yet):
      // this transaction creates non-idempotent rows (application, screening,
      // referral), so we must not re-run it after an ambiguous mid-commit drop.
      await withDbRetry(() => prisma.$transaction(async (tx) => {
        // Sponsored enrollment (Phase B2). `sponsorPartner` is non-null only
        // for an active sponsorship, so this whole block is inert for every
        // other signup. Count funded seats BEFORE the enrollment upsert so
        // this signup does not count itself against the cap.
        let stampSponsorship = false;
        if (sponsorPartner) {
          // Scoped to the sponsorship WINDOW, not lifetime: `sponsoredByPartnerId`
          // is never cleared, so an unscoped count would still read last term's
          // total after a rollover and leave every new student unfunded.
          const usedSeats = await tx.courseEnrollment.count({
            where: buildSponsoredSeatWhere(sponsorPartner),
          });
          sponsorshipSeatCapReached = isSeatCapReached(sponsorPartner, usedSeats);
          stampSponsorship = !sponsorshipSeatCapReached;
        }

        await tx.user.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            organizationId,
            email: user.email!,
            fullName,
            phone,
            enrolledProgram: programSlug,
            enrolledAt: new Date(),
            needsComputerSupportFollowUp: needsComputerSupportFollowUp === true,
            careerRecommendationJson: careerRecommendationJson ?? undefined,
          },
          update: {
            fullName,
            phone,
            enrolledProgram: programSlug,
            ...(priorUser && !priorUser.enrolledAt ? { enrolledAt: new Date() } : {}),
            ...(needsComputerSupportFollowUp === true ? { needsComputerSupportFollowUp: true } : {}),
            ...(careerRecommendationJson !== undefined && careerRecommendationJson !== null
              ? { careerRecommendationJson }
              : {}),
          },
        });
  
        // INVARIANT: CourseEnrollment must stay in sync with User.enrolledProgram.
        // Self-serve enroll (POST /api/member/enroll) and admin create both do this.
        // Signup must do the same so inactivity crons and reporting see consistent state.
        if (programSlug) {
          // Multi-program: signup creates the user's first enrollment, mark
          // it primary. Composite-keyed upsert ensures retries don't create
          // duplicate (userId, programSlug) rows.
          await tx.courseEnrollment.upsert({
            where: { userId_programSlug: { userId: user.id, programSlug } },
            create: {
              organizationId,
              userId: user.id,
              programSlug,
              isPrimary: true,
              enrolledAt: new Date(),
              ...(stampSponsorship && sponsorPartner
                ? {
                    fundingSource: resolveSponsorshipFundingSource(sponsorPartner),
                    fundingNotes: buildFundingNotes(sponsorPartner),
                    sponsoredByPartnerId: sponsorPartner.id,
                  }
                : {}),
            },
            update: {
              isPrimary: true,
              enrolledAt: new Date(),
            },
          });

          // Funding provenance on an EXISTING enrollment is stamped only when
          // the row still has none — an admin who already recorded a grant or
          // employer as the payer must win over this automatic stamp. Done as
          // a scoped updateMany (same transaction) because an upsert's update
          // branch cannot express "only if currently null".
          //
          // All THREE provenance fields move together here, including
          // `sponsoredByPartnerId`. Stamping the sponsor id on the upsert's
          // update branch (where it used to live) was unguarded, so a
          // returning applicant coming back under a second school ended up
          // with school A's fundingNotes and school B's sponsor id — and
          // because the seat-cap denominator counts `sponsoredByPartnerId`, a
          // self-funded student silently consumed a school's seat.
          //
          // `fundingNotes: null` is part of the guard, not just `fundingSource`:
          // an admin can set notes with a null source via
          // /api/admin/members/[id]/enrollment-funding, and those notes are a
          // deliberate human record we must not overwrite.
          if (stampSponsorship && sponsorPartner) {
            await tx.courseEnrollment.updateMany({
              where: {
                userId: user.id,
                programSlug,
                fundingSource: null,
                fundingNotes: null,
              },
              data: {
                fundingSource: resolveSponsorshipFundingSource(sponsorPartner),
                fundingNotes: buildFundingNotes(sponsorPartner),
                sponsoredByPartnerId: sponsorPartner.id,
              },
            });
          }
        }
  
        // A student enrolling under a sponsoring high school attends that
        // school by definition, so record it on the profile — this drives the
        // minor/consent handling and school-level reporting. Independent of
        // the seat cap: which school they attend does not change when the
        // partner runs out of funded seats.
        //
        // Each key is conditional on actually having a value: the spread used
        // to always include `schoolDistrict`, so a partner with no district
        // configured nulled out whatever an admin had already recorded on the
        // member's profile.
        const schoolFields =
          sponsorPartner && sponsorPartner.partnerType === 'high_school'
            ? {
                ...(sponsorPartner.name.trim() ? { schoolName: sponsorPartner.name.trim() } : {}),
                ...(sponsorPartner.schoolDistrict?.trim()
                  ? { schoolDistrict: sponsorPartner.schoolDistrict.trim() }
                  : {}),
              }
            : {};

        await tx.profile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            profilePhone: phone,
            profileAddress,
            city: city?.trim() || null,
            state: state?.trim() || null,
            zip: zip?.trim() || null,
            smsOptIn: smsOptIn ?? false,
            hasEmploymentBarrier,
            barrierTypes: profileBarrierTypes,
            role: 'member',
            isMinor: ageGroup === 'under_18',
            gradeLevel: gradeLevel?.trim() || null,
            parentGuardianName: parentGuardianName?.trim() || null,
            parentGuardianEmail: parentGuardianEmail?.trim() || null,
            parentGuardianPhone: parentGuardianPhone?.trim() || null,
            ...(schoolName?.trim() ? { schoolName: schoolName.trim() } : {}),
            ...schoolFields,
          },
          update: {
            profilePhone: phone,
            profileAddress,
            city: city?.trim() || null,
            state: state?.trim() || null,
            zip: zip?.trim() || null,
            smsOptIn: smsOptIn ?? false,
            hasEmploymentBarrier,
            barrierTypes: profileBarrierTypes,
            role: 'member',
            ...(ageGroup === 'under_18' ? { isMinor: true } : {}),
            ...(gradeLevel?.trim() ? { gradeLevel: gradeLevel.trim() } : {}),
            ...(parentGuardianName?.trim() ? { parentGuardianName: parentGuardianName.trim() } : {}),
            ...(parentGuardianEmail?.trim() ? { parentGuardianEmail: parentGuardianEmail.trim() } : {}),
            ...(parentGuardianPhone?.trim() ? { parentGuardianPhone: parentGuardianPhone.trim() } : {}),
            ...(schoolName?.trim() ? { schoolName: schoolName.trim() } : {}),
            ...schoolFields,
          },
        });
  
        const application = await tx.application.create({
          data: {
            userId: user.id,
            status: ApplicationStatus.PENDING,
            programInterest: programInterestSummary,
            programRankedSlugs,
            recommendedOnetCode: recommendedOnetCode ?? null,
            recommendedCareerTitle: recommendedCareerTitle ?? null,
            notes: applicationNotes || null,
            submittedAt: new Date(),
            referralSource,
            referralPartnerId,
          },
          select: { id: true },
        });
        createdApplicationId = application.id;

        // Persist apply-flow eligibility screening for funnel analytics.
        // Upsert keyed on the unique user_id so a returning applicant who
        // re-runs the screener updates their row instead of violating the
        // unique constraint (which would roll back the whole signup).
        if (!isSchoolSignup && eligibilityQ1 && eligibilityQ2) {
          const screening = {
            organizationId,
            q1: eligibilityQ1,
            q2: eligibilityQ2,
            q3: eligibilityQ3 ?? null,
            qualifies: eligibilityQualifies ?? (eligibilityYesCount ?? 0) >= 1,
            yesCount: eligibilityYesCount ?? 0,
            receivingUnemployment: receivingUnemploymentNormalized,
            exhaustedUnemployment: exhaustedUnemploymentNormalized,
            layoffCompany: layoffCompanyNormalized,
            snapWic: snapWicNormalized,
            hearAbout: hearAboutNormalized,
            hearAboutOther: hearAboutOtherNormalized,
            partnerAmbassadorReferral: partnerAmbassadorNormalized,
          };
          await tx.applyEligibilityScreening.upsert({
            where: { userId: user.id },
            create: { userId: user.id, ...screening },
            update: screening,
          });
        }
  
        // Create partner referral record so the member shows in partner's
        // referred members list. UPSERT, not create: `@@unique([partnerId,
        // memberId])` means a re-submit by a returning applicant — notably one
        // who applied but never confirmed their email, where Supabase hands
        // back the real user — would raise P2002, roll the whole transaction
        // back, and return a generic 500. The durable ref cookie makes that
        // re-submit path the norm, not an edge case. `update: {}` keeps the
        // original `referredAt` and any admin-assigned partner user intact.
        if (referralPartnerId) {
          await tx.partnerReferral.upsert({
            where: {
              partnerId_memberId: { partnerId: referralPartnerId, memberId: user.id },
            },
            create: { partnerId: referralPartnerId, memberId: user.id },
            update: {},
          });
        }
      }), { shouldRetry: isConnectionAcquisitionError });
      const attributionMetadata: Record<string, string> = {};
      if (utmSource) attributionMetadata.utm_source = utmSource;
      if (utmMedium) attributionMetadata.utm_medium = utmMedium;
      if (utmCampaign) attributionMetadata.utm_campaign = utmCampaign;
      if (utmContent) attributionMetadata.utm_content = utmContent;
      if (utmTerm) attributionMetadata.utm_term = utmTerm;
      if (referrer) attributionMetadata.referrer = referrer;

      await trackEvent({
        userId: user.id,
        eventName: 'apply_signup_completed',
        entityType: 'program',
        entityId: programSlug,
        metadata: {
          smsOptIn: smsOptIn ?? false,
          program_ranked_slugs: programRankedSlugs,
          ...getConversionValuePayload('apply_signup_completed'),
          ...attributionMetadata,
        },
        sourcePage: '/apply/create-account',
      });
  
      const eligibilityEmailFields = {
        q1: eligibilityQ1 ?? null,
        q2: eligibilityQ2 ?? null,
        q3: eligibilityQ3 ?? null,
        qualifies: eligibilityQualifies ?? null,
        yesCount: eligibilityYesCount ?? null,
        receivingUnemployment: receivingUnemploymentNormalized,
        exhaustedUnemployment: exhaustedUnemploymentNormalized,
        layoffCompany: layoffCompanyNormalized,
        snapWic: snapWicNormalized,
        hearAbout: hearAboutNormalized,
        hearAboutOther: hearAboutOtherNormalized,
        partnerAmbassadorReferral: partnerAmbassadorNormalized,
      };

      // Applicant receipt is awaited before the success response — the promise
      // the confirmation page makes ("receipt on file"). Serverless `after()`
      // alone still races on Vercel: the function can freeze before Resend
      // finishes, so Sandra-style misses happen even when signup succeeds.
      // Failures must NOT roll back account creation; log + capture only.
      try {
        const result = await sendApplicationConfirmationEmail({
          to: user.email!,
          fullName,
          eligibility: eligibilityEmailFields,
        });
        if (!result.ok) {
          throw new Error(result.error ?? 'Application confirmation email failed');
        }
      } catch (err) {
        logger.error('Member application confirmation email failed', { err });
        captureApiError(err, {
          route: 'POST /api/apply/signup#applicationConfirmation',
          extra: { userId: user.id },
        });
      }

      // Staff / partner notifications stay in `after()` — not user-blocking.
  
      // Soft seat cap: the student is already through, but an admin has to
      // decide who funds this seat. Surfaced two STAFF-ONLY ways — this
      // logger.warn, and the extra line appended to the admin alert email
      // below. Deliberately NOT persisted to `Application.notes`, which the
      // member self-serve GDPR export returns verbatim (see `seatCapNote`).
      if (sponsorshipSeatCapReached && sponsorPartner) {
        logger.warn('Sponsored enrollment seat cap reached; enrollment left unfunded', {
          partnerId: sponsorPartner.id,
          partnerName: sponsorPartner.name,
          seatCap: sponsorPartner.sponsorshipSeatCap,
          userId: user.id,
          applicationId: createdApplicationId,
        });
      }

      if (createdApplicationId) {
        // Staff-facing copy of the notes: the persisted `Application.notes`
        // plus the seat-cap line, which exists only here and in the warn above.
        const adminAlertNotes =
          sponsorshipSeatCapReached && sponsorPartner
            ? [applicationNotes, seatCapNote(sponsorPartner.name)].filter(Boolean).join('\n')
            : applicationNotes;
        // Capture a narrowed string for the `after()` closure — TS does not
        // keep the `if (createdApplicationId)` narrow across the callback.
        const applicationIdForAlert = createdApplicationId;

        after(async () => {
          try {
            const result = await sendNewApplicationAdminEmail({
              applicantName: fullName,
              applicantEmail: user.email!,
              applicantPhone: phone,
              programInterest: programInterestSummary,
              applicationId: applicationIdForAlert,
              applicationNotes: adminAlertNotes || undefined,
              eligibility: eligibilityEmailFields,
            });
            if (!result.ok) {
              throw new Error(result.error ?? 'Admin new-application alert failed');
            }
          } catch (err) {
            logger.error('Admin new-application alert email failed', { err });
            captureApiError(err, {
              route: 'POST /api/apply/signup#newApplicationAdmin',
              extra: { userId: user.id, applicationId: applicationIdForAlert },
            });
          }
        });
      }

      // School signup acknowledgments: parent/guardian (under 18) + partner admin.
      // One partner email per signup — replaces sendPartnerNewMemberAssignedEmail
      // here to avoid duplicate admin spam on the same event.
      if (isSchoolSignup && referralPartnerId) {
        const schoolDisplayName =
          schoolName?.trim() || referralPartnerName?.trim() || 'your school';

        if (
          ageGroup === 'under_18' &&
          parentGuardianEmail?.trim()
        ) {
          const parentEmail = parentGuardianEmail.trim();
          after(() =>
            sendSchoolEnrollmentParentAckEmail({
              to: parentEmail,
              parentGuardianName: parentGuardianName,
              studentName: fullName,
              schoolName: schoolDisplayName,
              programInterest: programInterestSummary,
            }).catch((err) => {
              logger.error('School enrollment parent ack email failed', { err });
              captureApiError(err, {
                route: 'POST /api/apply/signup#schoolParentAck',
                extra: { userId: user.id, referralPartnerId },
              });
            }),
          );
        }

        if (
          referralPartnerContactEmail &&
          referralPartnerNotifyOnEnrollment
        ) {
          const partnerEmail = referralPartnerContactEmail;
          after(() =>
            sendSchoolEnrollmentPartnerAckEmail({
              to: partnerEmail,
              partnerName: referralPartnerName ?? schoolDisplayName,
              studentName: fullName,
              studentEmail: user.email!,
              programInterest: programInterestSummary,
              gradeLevel: gradeLevel?.trim() || null,
            }).catch((err) => {
              logger.error('School enrollment partner ack email failed', { err });
              captureApiError(err, {
                route: 'POST /api/apply/signup#schoolPartnerAck',
                extra: { userId: user.id, referralPartnerId },
              });
            }),
          );
        }
      }
    } catch (dbError) {
      captureApiError(dbError, { route: 'POST /api/apply/signup' });
      // Roll back the auth user we just created so a failed signup doesn't
      // leave an orphaned auth.users row with no app `users` row (the state
      // that later causes member_events / message_threads FK violations and
      // "Member not found" crashes). Mirror /api/member/signup's cleanup.
      // Only delete when this was a brand-new user: `priorUser` is null means
      // no app row existed before this request, so the auth account was created
      // by this signUp call. A returning applicant (priorUser set) keeps theirs.
      if (!priorUser) {
        await getSupabaseAdmin()
          .auth.admin.deleteUser(user.id)
          .catch((cleanupErr) => {
            logger.error('apply/signup: failed to clean up auth user after DB error', {
              userId: user.id,
              err: cleanupErr,
            });
          });
      }
      return NextResponse.json({ error: 'We started your account, but could not finish setup. Try logging in once, then use password reset if needed. If that does not work, contact us and we will finish your setup.' }, { status: 500 });
    }

    // Consume the partner ref cookie exactly once. School computer labs,
    // library machines, and family devices are the normal case for this
    // funnel: without this, applicants #2..N for the next 30 days silently
    // inherit the first student's school — partner attribution, funding
    // stamp, and the `schoolName`/`schoolDistrict` that drive minor/consent
    // handling. Mirrors how ApplyCreateAccountForm clears its sessionStorage
    // key on success. Only runs when a cookie was actually present, so a
    // signup with no partner ref emits no `Set-Cookie` at all.
    if (hasPartnerRefCookie) {
      try {
        cookieStore.set(PARTNER_REF_COOKIE, '', partnerRefCookieClearOptions());
      } catch (cookieErr) {
        // The account is already committed; never turn a cookie write into a
        // failed signup.
        logger.warn('apply/signup: failed to clear partner ref cookie', {
          userId: user.id,
          err: cookieErr,
        });
      }
    }

    if (authData.session) {
      const schoolQuery = isSchoolSignup ? '?school=1' : '';
      const minorQuery =
        isSchoolSignup && ageGroup === 'under_18' && parentGuardianEmail?.trim()
          ? `${schoolQuery ? '&' : '?'}minor=1`
          : '';
      return NextResponse.json({
        success: true,
        redirectTo: `/apply/confirmation${schoolQuery}${minorQuery}`,
      });
    }
  
    return NextResponse.json({
      success: true,
      message: 'Please verify your email, then log in to view your dashboard and next steps.',
      redirectTo: '/login',
    });
  } catch (error) {
    logger.error('/apply/signup', { err: error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
