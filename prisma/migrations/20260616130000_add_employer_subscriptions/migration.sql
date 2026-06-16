-- CreateTable
CREATE TABLE "employer_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employer_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employer_subscriptions_user_id_idx" ON "employer_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "employer_subscriptions_organization_id_idx" ON "employer_subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "employer_subscriptions_status_idx" ON "employer_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "employer_subscriptions_stripe_subscription_id_key" ON "employer_subscriptions"("stripe_subscription_id");

-- AddForeignKey
ALTER TABLE "employer_subscriptions" ADD CONSTRAINT "employer_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
