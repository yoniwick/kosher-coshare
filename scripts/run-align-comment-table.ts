import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function main() {
  await sql`ALTER TABLE "comment" ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES "comment"(id) ON DELETE CASCADE`;
  await sql`CREATE INDEX IF NOT EXISTS comment_parent_idx ON "comment"(parent_id)`;
  await sql`ALTER TABLE "comment" DROP COLUMN IF EXISTS deleted_at`;
  console.log("OK: comment.parent_id added/indexed, deleted_at dropped if present.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
