import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieOptions';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { z } from 'zod';
import { checkApplySignupRateLimit, checkSignupEmailRateLimit } from '@/lib/rate-limit';
import { trackEvent } from '@/lib/events/track';
import { getConversionValuePayload } from '@/lib/analytics/conversionValue';
import { ApplicationStatus } from '@prisma/client';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logger } from '@/lib/observability/logger';
import { withApiGuc } from '@/lib/db/withRequestGuc';

import {
  sendApplicationConfirmationEmail,
  sendNewApplicationAdminEmail,
} from '@/lib/email';

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
  ageGroup: z.enum(['18_24', '25_50', '50_plus']).optional().nullable(),
  county: z.string().trim().max(100).optional().nullable(),
  primaryBarrier: z.string().trim().max(100).optional().nullable(),
  primaryBarriers: z.array(z.string().trim().max(100)).max(20).optional().nullable(),
  eligibilityQualifies: z.boolean().optional().nullable(),
  eligibilityYesCount: z.number().int().min(0).max(3).optional().nullable(),
  eligibilityQ1: z.enum(['yes', 'no']).optional().nullable(),
  eligibilityQ2: z.enum(['yes', 'no']).optional().nullable(),
  eligibilityQ3: z.enum(['yes', 'no']).optional().nullable(),
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
});export const POST = withApiGuc(async (request: NextRequest) => {
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
      county,
      primaryBarrier,
      primaryBarriers,
      eligibilityQualifies,
      eligibilityYesCount,
      eligibilityQ1,
      eligibilityQ2,
      eligibilityQ3,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      referrer,
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
    const profileBarrierTypes = rawBarriers.map((b) => b.trim()).filter((b) => b && b !== 'none');
    const applicationNotes = [
      ageGroup ? `Age group: ${ageGroup}` : null,
      city?.trim() ? `City: ${city.trim()}` : null,
      state?.trim() ? `State: ${state.trim()}` : null,
      zip?.trim() ? `ZIP: ${zip.trim()}` : null,
      county?.trim() ? `County: ${county.trim()}` : null,
      profileBarrierTypes.length > 0 ? `Primary barrier(s): ${profileBarrierTypes.join(', ')}` : null,
      typeof eligibilityQualifies === 'boolean' ? `Quick eligibility fit: ${eligibilityQualifies ? 'yes' : 'review'} (${eligibilityYesCount ?? 0}/3)` : null,
    ].filter(Boolean).join('\n');
  
    let referralPartnerId: string | null = null;
    let referralSource: string | null = null;
    const refRaw = referralRef?.trim().toLowerCase();
    if (refRaw) {
      const partner = await prisma.$transaction((tx) => tx.partner.findFirst({
        where: {
          active: true,
          OR: [{ referralCode: refRaw }, { slug: refRaw }],
        },
        select: { id: true },
      }));
      if (partner) {
        referralPartnerId = partner.id;
        referralSource = `partner_ref:${refRaw}`;
      }
    }
  
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Our signup service is temporarily unavailable. Please try again shortly.' }, { status: 500 });
    }
  
    const cookieStore = await cookies();
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
  
    const organizationId = await getDefaultOrganizationId();
    const priorUser = await prisma.$transaction((tx) => tx.user.findUnique({
      where: { id: user.id },
      select: { enrolledAt: true },
    }));
  
    let createdApplicationId: string | null = null;
    try {
      await prisma.$transaction(async (tx) => {
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
            },
            update: {
              isPrimary: true,
              enrolledAt: new Date(),
            },
          });
        }
  
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
            hasEmploymentBarrier: profileBarrierTypes.length > 0,
            barrierTypes: profileBarrierTypes,
            role: 'member',
          },
          update: {
            profilePhone: phone,
            profileAddress,
            city: city?.trim() || null,
            state: state?.trim() || null,
            zip: zip?.trim() || null,
            smsOptIn: smsOptIn ?? false,
            hasEmploymentBarrier: profileBarrierTypes.length > 0,
            barrierTypes: profileBarrierTypes,
            role: 'member',
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
        if (eligibilityQ1 && eligibilityQ2 && eligibilityQ3) {
          await tx.applyEligibilityScreening.create({
            data: {
              organizationId,
              userId: user.id,
              q1: eligibilityQ1,
              q2: eligibilityQ2,
              q3: eligibilityQ3,
              qualifies: eligibilityQualifies ?? (eligibilityYesCount ?? 0) >= 2,
              yesCount: eligibilityYesCount ?? 0,
            },
          });
        }
  
        // Create partner referral record so the member shows in partner's referred members list
        if (referralPartnerId) {
          await tx.partnerReferral.create({
            data: { partnerId: referralPartnerId, memberId: user.id },
          });
        }
      });
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
  
      // Fire-and-forget post-signup notifications. Email failures (Resend
      // outage, missing env, transient network) must NOT block account
      // creation — the user is already authenticated and their record is
      // committed. Errors are logged and surfaced via captureApiError so we
      // can spot patterns without losing the signup.
      sendApplicationConfirmationEmail({
        to: user.email!,
        fullName,
      }).catch((err) => {
        logger.error('Member application confirmation email failed', { err });
        captureApiError(err, {
          route: 'POST /api/apply/signup#applicationConfirmation',
          extra: { userId: user.id },
        });
      });
  
      if (createdApplicationId) {
        sendNewApplicationAdminEmail({
          applicantName: fullName,
          applicantEmail: user.email!,
          applicantPhone: phone,
          programInterest: programInterestSummary,
          applicationId: createdApplicationId,
          applicationNotes: applicationNotes || undefined,
        }).catch((err) => {
          logger.error('Admin new-application alert email failed', { err });
          captureApiError(err, {
            route: 'POST /api/apply/signup#newApplicationAdmin',
            extra: { userId: user.id, applicationId: createdApplicationId },
          });
        });
      }
    } catch (dbError) {
      captureApiError(dbError, { route: 'POST /api/apply/signup' });
      return NextResponse.json({ error: 'We started your account, but could not finish setup. Try logging in once, then use password reset if needed. If that does not work, contact us and we will finish your setup.' }, { status: 500 });
    }
  
    if (authData.session) {
      return NextResponse.json({ success: true, redirectTo: '/apply/thank-you' });
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
