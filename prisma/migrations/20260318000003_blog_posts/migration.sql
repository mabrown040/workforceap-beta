CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" TEXT UNIQUE NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT,
  "content" TEXT NOT NULL,
  "cover_image" TEXT,
  "author_name" TEXT DEFAULT 'WorkforceAP Team',
  "published" BOOLEAN DEFAULT false,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "category" TEXT
);

CREATE INDEX IF NOT EXISTS "blog_posts_slug_idx" ON "blog_posts"("slug");
CREATE INDEX IF NOT EXISTS "blog_posts_published_idx" ON "blog_posts"("published");
CREATE INDEX IF NOT EXISTS "blog_posts_category_idx" ON "blog_posts"("category");
