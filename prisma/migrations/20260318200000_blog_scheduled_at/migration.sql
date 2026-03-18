-- Add scheduled_at column to blog_posts table
ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP(3);