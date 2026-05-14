-- Add last_login_at to users table for engagement tracking
ALTER TABLE "users" ADD COLUMN "last_login_at" TIMESTAMP(3);
