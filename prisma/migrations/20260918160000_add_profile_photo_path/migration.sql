-- Member self-serve profile photo (private `member-files` object key).
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "profile_photo_path" TEXT;
