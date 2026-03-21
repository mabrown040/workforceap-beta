-- Super Admin role for testing: allow mabrown040@gmail.com to access Admin, Partner, and Student views
-- Profile.role is a free-form string; 'super_admin' is a valid value
UPDATE profiles
SET role = 'super_admin'
WHERE user_id IN (SELECT id FROM users WHERE email = 'mabrown040@gmail.com');
