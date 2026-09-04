-- J5 training invoice + J6 cover letter packets (ops request 9/3/26).
-- One row per signed packet; PDFs are rendered on demand from the row.
CREATE TABLE IF NOT EXISTS "training_billing_packets" (
  "id"                TEXT NOT NULL,
  "organization_id"   TEXT NOT NULL,
  "member_id"         TEXT NOT NULL,
  "program_slug"      TEXT NOT NULL,
  "packet_number"     TEXT NOT NULL,
  "status"            TEXT NOT NULL DEFAULT 'signed',
  "invoice_date"      DATE NOT NULL,
  "due_date"          DATE,
  "bill_to_name"      TEXT NOT NULL,
  "bill_to_attention" TEXT,
  "bill_to_address"   TEXT,
  "bill_to_email"     TEXT,
  "reference_number"  TEXT,
  "line_items"        JSONB NOT NULL,
  "total_amount"      DOUBLE PRECISION NOT NULL,
  "cover_letter_body" TEXT NOT NULL,
  "signer_name"       TEXT NOT NULL,
  "signer_title"      TEXT NOT NULL,
  "signature_image"   TEXT,
  "signed_at"         TIMESTAMP(3) NOT NULL,
  "signed_by_id"      TEXT NOT NULL,
  "sent_at"           TIMESTAMP(3),
  "sent_to"           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "send_count"        INTEGER NOT NULL DEFAULT 0,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "training_billing_packets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "training_billing_packets_organization_id_packet_number_key"
  ON "training_billing_packets" ("organization_id", "packet_number");
CREATE INDEX IF NOT EXISTS "training_billing_packets_organization_id_created_at_idx"
  ON "training_billing_packets" ("organization_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "training_billing_packets_member_id_created_at_idx"
  ON "training_billing_packets" ("member_id", "created_at" DESC);

ALTER TABLE "training_billing_packets"
  ADD CONSTRAINT "training_billing_packets_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "training_billing_packets"
  ADD CONSTRAINT "training_billing_packets_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_billing_packets"
  ADD CONSTRAINT "training_billing_packets_signed_by_id_fkey"
  FOREIGN KEY ("signed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
