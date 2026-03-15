-- CreateTable
CREATE TABLE "learning_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pathway_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_progress_user_id_pathway_id_key" ON "learning_progress"("user_id", "pathway_id");

-- CreateIndex
CREATE INDEX "learning_progress_user_id_idx" ON "learning_progress"("user_id");

-- AddForeignKey
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
