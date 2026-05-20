-- Member onboarding tour: persist skip/dismiss so the tour does not re-show.
ALTER TABLE "users" ADD COLUMN "tour_dismissed_at" TIMESTAMP(3);
