-- Fixed SQL for test member account
-- Run ALL three blocks at once in Supabase SQL Editor

-- 1. Create user record
INSERT INTO users (id, organization_id, email, full_name, phone, enrolled_program, enrolled_at, created_at, updated_at)
VALUES (
  '04c0d37e-e2b2-459b-a26d-6bf3fa635880',
  (SELECT id FROM organizations WHERE slug = 'workforceap' LIMIT 1),
  'test-member-account@workforceap.org',
  'Test User',
  '512-555-0199',
  'digital-literacy-empowerment-class',
  NOW(),
  NOW(),
  NOW()
);

-- 2. Create profile record
INSERT INTO profiles (id, user_id, profile_phone, us_citizen, authorized_to_work, has_disability, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '04c0d37e-e2b2-459b-a26d-6bf3fa635880',
  '512-555-0199',
  true,
  true,
  false,
  'member',
  NOW(),
  NOW()
);

-- 3. Create enrollment record
INSERT INTO course_enrollments (organization_id, user_id, program_slug, enrolled_at)
VALUES (
  (SELECT id FROM organizations WHERE slug = 'workforceap' LIMIT 1),
  '04c0d37e-e2b2-459b-a26d-6bf3fa635880',
  'digital-literacy-empowerment-class',
  NOW()
);