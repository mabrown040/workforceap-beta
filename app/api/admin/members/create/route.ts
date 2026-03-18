import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getProgramBySlug } from '@/lib/content/programs';

const EMPLOYMENT_OPTIONS = ['Unemployed', 'Underemployed', 'Employed', 'Self-Employed'];
const VETERAN_OPTIONS = ['Not a Veteran', 'Veteran', 'Disabled Veteran'];
const INCOME_OPTIONS = ['Under $20K', '$20K–$40K', '$40K–$60K', 'Over $60K'];
const EDUCATION_OPTIONS = ['Less than HS', 'HS Diploma or GED', 'Some College', "Associate's", "Bachelor's", 'Graduate'];
const REFERRAL_OPTIONS = ['Referral', 'Community Event', 'Social Media', 'Workforce Solutions', 'TWC', 'Church', 'Other'];
const ETHNICITY_OPTIONS = [
  'Hispanic/Latino',
  'White',
  'Black or African American',
  'Asian',
  'American Indian or Alaska Native',
  'Native Hawaiian or Pacific Islander',
  'Two or More Races',
];

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;

  const firstName = typeof o.firstName === 'string' ? o.firstName.trim() : '';
  const lastName = typeof o.lastName === 'string' ? o.lastName.trim() : '';
  const email = typeof o.email === 'string' ? o.email.toLowerCase().trim() : '';
  const phone = typeof o.phone === 'string' ? o.phone.trim() : '';
  const address = typeof o.address === 'string' ? o.address.trim() : undefined;
  const dob = typeof o.dob === 'string' ? o.dob.trim() || undefined : undefined;
  const employmentStatus = typeof o.employmentStatus === 'string' && EMPLOYMENT_OPTIONS.includes(o.employmentStatus) ? o.employmentStatus : undefined;
  const veteranStatus = typeof o.veteranStatus === 'string' && VETERAN_OPTIONS.includes(o.veteranStatus) ? o.veteranStatus : undefined;
  const householdIncome = typeof o.householdIncome === 'string' && INCOME_OPTIONS.includes(o.householdIncome) ? o.householdIncome : undefined;
  const educationLevel = typeof o.educationLevel === 'string' && EDUCATION_OPTIONS.includes(o.educationLevel) ? o.educationLevel : undefined;
  const referralSource = typeof o.referralSource === 'string' && REFERRAL_OPTIONS.includes(o.referralSource) ? o.referralSource : undefined;
  const notes = typeof o.notes === 'string' ? o.notes.trim() : undefined;
  const usCitizen = o.usCitizen === true || o.usCitizen === 'true';
  const authorizedToWork = o.authorizedToWork === true || o.authorizedToWork === 'true';
  const hasDisability = o.hasDisability === true || o.hasDisability === 'true';
  const ethnicity = typeof o.ethnicity === 'string' && ETHNICITY_OPTIONS.includes(o.ethnicity) ? o.ethnicity : undefined;
  const programSlug = typeof o.programSlug === 'string' ? o.programSlug.trim() : '';
  const programNotes = typeof o.programNotes === 'string' ? o.programNotes.trim() : undefined;
  const resumeOriginalPath = typeof o.resumeOriginalPath === 'string' ? o.resumeOriginalPath : undefined;
  const resumeEnhancedPath = typeof o.resumeEnhancedPath === 'string' ? o.resumeEnhancedPath : undefined;

  if (!firstName || !email) {
    return NextResponse.json({ error: 'First name and email are required' }, { status: 400 });
  }
  if (!usCitizen || !authorizedToWork) {
    return NextResponse.json({ error: 'US Citizen and Authorized to Work must be Yes' }, { status: 400 });
  }
  if (!programSlug) {
    return NextResponse.json({ error: 'Program selection is required' }, { status: 400 });
  }

  const program = getProgramBySlug(programSlug);
  if (!program) {
    return NextResponse.json({ error: 'Invalid program' }, { status: 400 });
  }

  const fullName = `${firstName} ${lastName}`.trim() || firstName;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const supabase = getSupabaseAdmin();

  // Try invite first (sends set-password email). Fall back to createUser if invite not supported.
  let authUser: { id: string; email?: string } | null = null;

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/dashboard`,
    data: { full_name: fullName, phone },
  });

  if (!inviteError && inviteData.user) {
    authUser = inviteData.user;
  } else if (inviteError?.message?.includes('already') || inviteError?.code === 'user_already_exists') {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
  } else {
    // Fallback: createUser with temp password (no email)
    const tempPassword = `WfAP${Date.now().toString(36)}!`;
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });
    if (createError) {
      if (createError.message.includes('already')) {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
      }
      console.error('Admin create user error:', createError);
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }
    authUser = createData.user;
    // Optionally trigger password reset so user can set their own
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/dashboard` });
  }

  if (!authUser) {
    return NextResponse.json({ error: 'Account creation failed' }, { status: 500 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: authUser.id,
          email: authUser.email!,
          fullName,
          phone: phone || null,
          enrolledProgram: programSlug,
          enrolledAt: new Date(),
        },
      });

      await tx.profile.create({
        data: {
          userId: authUser.id,
          profilePhone: phone || null,
          profileAddress: address || null,
          dob: dob ? new Date(dob) : null,
          veteranStatus: veteranStatus || null,
          employmentStatus: employmentStatus || null,
          householdIncome: householdIncome || null,
          referralSource: referralSource || null,
          usCitizen,
          authorizedToWork,
          hasDisability,
          ethnicity: ethnicity || null,
          counselorNotes: notes || null,
          resumeOriginalPath: resumeOriginalPath || null,
          resumeEnhancedPath: resumeEnhancedPath || null,
          role: 'member',
        },
      });
    });
  } catch (dbError) {
    console.error('Admin create member DB error:', dbError);
    return NextResponse.json({ error: 'Failed to create member. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    userId: authUser.id,
    email,
    message: `Member created. Welcome email sent to ${email}.`,
  });
}
