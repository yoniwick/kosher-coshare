-- Run once if you manage schema manually (or use: npm run db:push)
ALTER TABLE "recipe" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT true NOT NULL;
