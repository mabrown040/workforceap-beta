-- CreateEnum
CREATE TYPE "TokenLinkType" AS ENUM ('interview_prep', 'eligibility_questionnaire');

-- CreateTable
CREATE TABLE "tokenized_link" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenLinkType" NOT NULL,
    "email" TEXT,
    "subject_user_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,
    "org_id" TEXT,

    CONSTRAINT "tokenized_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokenized_link_token_key" ON "tokenized_link"("token");

-- CreateIndex
CREATE INDEX "tokenized_link_token_idx" ON "tokenized_link"("token");

-- CreateIndex
CREATE INDEX "tokenized_link_type_idx" ON "tokenized_link"("type");

-- CreateIndex
CREATE INDEX "tokenized_link_subject_user_id_idx" ON "tokenized_link"("subject_user_id");

