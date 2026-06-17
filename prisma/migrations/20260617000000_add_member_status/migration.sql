-- CreateEnum
CREATE TYPE "member_status" AS ENUM ('active', 'inactive', 'placed');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "member_status" "member_status" DEFAULT 'active';
