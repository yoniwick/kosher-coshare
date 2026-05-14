-- Run this once in Neon SQL Editor (or psql) if drizzle-kit push asks:
--   "Is parent_id ... created or renamed from deleted_at?"
--
-- ALWAYS add parent_id as a NEW column. Never "rename" deleted_at -> parent_id
-- (that would turn timestamps into bogus parent UUIDs).
--
-- After this runs, `npm run db:push` should align without that prompt.

ALTER TABLE "comment" ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES "comment"(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS comment_parent_idx ON "comment"(parent_id);

ALTER TABLE "comment" DROP COLUMN IF EXISTS deleted_at;
