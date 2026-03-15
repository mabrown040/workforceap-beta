# Auth Troubleshooting

## Password reset: "Failed to fetch"

Password reset now uses a server-side API route (`/api/auth/forgot-password`) to avoid client-side fetch issues. If you still see errors:

1. **Redirect URLs** – In Supabase Dashboard → Authentication → URL Configuration, add your site URLs to **Redirect URLs** (e.g. `https://yoursite.com/login`, `https://yoursite.vercel.app/login`).
2. **Email provider** – Ensure Supabase Auth email is configured (SMTP or built-in).

## User in Prisma `users` but not in Supabase Auth

Our app has two user stores:

- **Supabase Auth** (`auth.users`) – source of truth for login, sessions, password reset
- **Prisma** (`public.users`) – app data (profile, applications, AI results)

Users created via the member signup flow are added to **both**. If a user exists only in Prisma (e.g. from a seed or manual insert), they cannot log in or reset password.

**Fix options:**

1. **Create in Supabase Auth** – In Supabase Dashboard → Authentication → Users, add the user with the same email. The `id` will differ unless you use the Admin API to create with a specific UUID matching Prisma.
2. **Have them sign up again** – Use the normal signup flow at `/signup`; this creates the user in both systems.
3. **Admin sync** – For bulk sync, use Supabase Admin API `createUser()` and ensure the returned `id` matches the Prisma `users.id` if you need to link them.
