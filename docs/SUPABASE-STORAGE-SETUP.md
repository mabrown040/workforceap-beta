# Supabase Storage setup

Employer logo uploads use a dedicated public bucket so company logos can appear in the employer portal header and on member-facing job cards.

## `employer-logos` bucket

1. Open the [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Storage**.
2. Create a new bucket named exactly: **`employer-logos`**.
3. Set the bucket to **Public** so logo URLs returned by the app (`getPublicUrl`) work without signed URLs for viewers.
4. **Policies (recommended):** allow authenticated users to upload only under paths they own. The app uploads to `{employerId}/logo.{ext}` using the server-side service role; adjust policies if you later allow direct browser uploads with the anon key.
5. Public object URL shape:

   `{SUPABASE_URL}/storage/v1/object/public/employer-logos/{employerId}/logo.png`

If the bucket is missing, `POST /api/employer/logo` returns a 500 with a message to create the bucket.

## Realtime (member ↔ counselor chat)

Chat uses **Supabase Realtime** `postgres_changes` on `messages` and `message_threads`. After migrations, add both tables to the publication if they are not already included:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

See also comments in `supabase/policies.sql`.
