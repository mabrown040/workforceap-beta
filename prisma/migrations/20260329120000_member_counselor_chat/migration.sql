-- Member <-> counselor chat (Supabase Realtime postgres_changes)
CREATE TABLE IF NOT EXISTS "message_threads" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "counselor_user_id" TEXT,
    "member_last_read_at" TIMESTAMP(3),
    "counselor_last_read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "message_threads_member_id_key" ON "message_threads"("member_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'message_threads_member_id_fkey'
  ) THEN
    ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_member_id_fkey"
      FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'message_threads_counselor_user_id_fkey'
  ) THEN
    ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_counselor_user_id_fkey"
      FOREIGN KEY ("counselor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "messages_thread_id_created_at_idx" ON "messages"("thread_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_thread_id_fkey'
  ) THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_fkey"
      FOREIGN KEY ("thread_id") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_author_id_fkey'
  ) THEN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_fkey"
      FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Supabase Realtime: include old row data in postgres_changes payloads
ALTER TABLE "message_threads" REPLICA IDENTITY FULL;
ALTER TABLE "messages" REPLICA IDENTITY FULL;
