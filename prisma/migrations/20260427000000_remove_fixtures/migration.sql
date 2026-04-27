-- Delete fixture messages
DELETE FROM "messages" WHERE "body" LIKE '%[ARCHIVED FIXTURE]%';

-- Delete test users and cascade
DELETE FROM "users" WHERE "email" IN ('member.success@workforceap.org', 'mbrown@hsconglomerates.com');

-- Delete test partners
DELETE FROM "partners" WHERE "name" = 'Test Students';
