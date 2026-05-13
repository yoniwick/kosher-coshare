import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js reads `.env.local`; drizzle-kit only loads `.env` by default — load both so `npm run db:push` works.
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
