-- CreateTable
CREATE TABLE "user_certifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cert_name" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_certifications_user_id_cert_name_key" ON "user_certifications"("user_id", "cert_name");

-- CreateIndex
CREATE INDEX "user_certifications_user_id_idx" ON "user_certifications"("user_id");

-- AddForeignKey
ALTER TABLE "user_certifications" ADD CONSTRAINT "user_certifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
