import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';

/**
 * POST /api/gdpr/delete
 * Initiates account deletion for the authenticated user.
 * Implements GDPR Article 17 — Right to erasure (right to be forgotten).
 * 
 * Deletion is soft (anonymized) not hard delete — preserves aggregate stats
 * while removing personal identifiers.
 */
export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  // Anonymize user record
  await prisma.$executeRaw`
    UPDATE users 
    SET email = 'deleted_' || id || '@workforceap.org',
        updated_at = NOW()
    WHERE id = ${userId}
  `;

  // Anonymize profile
  await prisma.$executeRaw`
    UPDATE profiles
    SET address = NULL,
        city = NULL,
        state = NULL,
        zip = NULL,
        dob = NULL,
        profile_phone = NULL,
        profile_address = NULL,
        profile_linkedin = NULL,
        profile_bio = NULL,
        counselor_notes = NULL,
        resume_original_path = NULL,
        resume_enhanced_path = NULL,
        parent_guardian_name = NULL,
        parent_guardian_email = NULL,
        parent_guardian_phone = NULL,
        school_name = NULL,
        school_district = NULL,
        student_id = NULL,
        updated_at = NOW()
    WHERE user_id = ${userId}
  `;

  // Mark as deleted
  await prisma.$executeRaw`
    INSERT INTO member_events (id, user_id, event_name, entity_type, metadata, created_at)
    VALUES (
      gen_random_uuid(),
      ${userId},
      'account_deleted',
      'gdpr',
      ${JSON.stringify({ deletedAt: new Date().toISOString(), reason: 'user_requested' })},
      NOW()
    )
  `;

  return NextResponse.json({ 
    ok: true, 
    message: 'Your account has been deleted. Personal data has been anonymized.' 
  });
}
