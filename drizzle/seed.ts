import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });
import { db } from "../lib/db";
import { tags } from "../lib/db/schema/recipes";

async function main() {
  const database = db();

  await database
    .insert(tags)
    .values(
      [
        "shabbat",
        "quick",
        "one-pan",
        "pesach",
        "vegetarian",
        "comfort",
        "soup",
        "salad",
        "dessert",
      ].map((name) => ({
        name,
        normalizedName: name,
      }))
    )
    .onConflictDoNothing({ target: tags.normalizedName });

  // eslint-disable-next-line no-console
  console.log("Seed complete (tags upserted where missing).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
