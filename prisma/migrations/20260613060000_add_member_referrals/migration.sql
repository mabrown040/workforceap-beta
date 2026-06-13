-- Member-to-member referral perks (distinct from partner_referrals).

CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referral_codes_user_id_key" ON "referral_codes"("user_id");
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

ALTER TABLE "referral_codes"
    ADD CONSTRAINT "referral_codes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "referral_conversions" (
    "id" TEXT NOT NULL,
    "referrer_user_id" TEXT NOT NULL,
    "referee_user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rewarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "referral_conversions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referral_conversions_referee_user_id_key" ON "referral_conversions"("referee_user_id");
CREATE INDEX "referral_conversions_referrer_user_id_idx" ON "referral_conversions"("referrer_user_id");
CREATE INDEX "referral_conversions_code_idx" ON "referral_conversions"("code");

ALTER TABLE "referral_conversions"
    ADD CONSTRAINT "referral_conversions_referrer_user_id_fkey"
    FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_conversions"
    ADD CONSTRAINT "referral_conversions_referee_user_id_fkey"
    FOREIGN KEY ("referee_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
