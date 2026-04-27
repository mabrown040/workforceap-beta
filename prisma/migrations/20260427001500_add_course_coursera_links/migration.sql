-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "program_slug" TEXT NOT NULL,
    "course_slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "estimated_hours" INTEGER,
    "coursera_course_id" TEXT,
    "coursera_slug" TEXT,
    "coursera_url_type" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courses_organization_id_program_slug_display_order_idx" ON "courses"("organization_id", "program_slug", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "courses_organization_id_program_slug_course_slug_key" ON "courses"("organization_id", "program_slug", "course_slug");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
