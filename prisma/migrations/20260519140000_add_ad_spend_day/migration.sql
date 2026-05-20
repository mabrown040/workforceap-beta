-- Daily ad spend for /admin/growth CPA/ROAS monitoring (admin-only via RLS)

CREATE TABLE "ad_spend_days" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "campaign" TEXT NOT NULL DEFAULT '',
    "date" DATE NOT NULL,
    "cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_spend_days_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ad_spend_days_organization_id_source_campaign_date_key"
  ON "ad_spend_days"("organization_id", "source", "campaign", "date");
CREATE INDEX "ad_spend_days_organization_id_date_idx" ON "ad_spend_days"("organization_id", "date");
CREATE INDEX "ad_spend_days_organization_id_source_date_idx" ON "ad_spend_days"("organization_id", "source", "date");

ALTER TABLE "ad_spend_days" ADD CONSTRAINT "ad_spend_days_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE ad_spend_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_spend_days_select_org" ON ad_spend_days;
CREATE POLICY "ad_spend_days_select_org" ON ad_spend_days
  FOR SELECT USING (can_access_org_row(organization_id));

DROP POLICY IF EXISTS "ad_spend_days_insert_admin" ON ad_spend_days;
CREATE POLICY "ad_spend_days_insert_admin" ON ad_spend_days
  FOR INSERT WITH CHECK (is_current_admin() AND can_access_org_row(organization_id));

DROP POLICY IF EXISTS "ad_spend_days_update_admin" ON ad_spend_days;
CREATE POLICY "ad_spend_days_update_admin" ON ad_spend_days
  FOR UPDATE
  USING (is_current_admin() AND can_access_org_row(organization_id))
  WITH CHECK (is_current_admin() AND can_access_org_row(organization_id));

DROP POLICY IF EXISTS "ad_spend_days_delete_admin" ON ad_spend_days;
CREATE POLICY "ad_spend_days_delete_admin" ON ad_spend_days
  FOR DELETE USING (is_current_admin() AND can_access_org_row(organization_id));
