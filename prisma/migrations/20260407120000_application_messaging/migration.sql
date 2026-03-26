-- Add employer-applicant messaging for in-portal communication

-- Track last message timestamps on applications
ALTER TABLE "job_posting_applications" ADD COLUMN "last_employer_message_at" TIMESTAMP(3);
ALTER TABLE "job_posting_applications" ADD COLUMN "last_applicant_message_at" TIMESTAMP(3);

-- Create application messages table
CREATE TABLE "application_messages" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "application_messages_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "application_messages" ADD CONSTRAINT "application_messages_application_id_fkey" 
    FOREIGN KEY ("application_id") REFERENCES "job_posting_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application_messages" ADD CONSTRAINT "application_messages_author_id_fkey" 
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "application_messages_application_id_idx" ON "application_messages"("application_id");
CREATE INDEX "application_messages_author_id_idx" ON "application_messages"("author_id");
