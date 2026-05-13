/**
 * Rasterizes public/brand/logo-app-icon.png into standard icon sizes.
 * Run: npm run generate-icons
 */
import sharp from "sharp";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "public/brand/logo-app-icon.png");

async function main() {
  await sharp(src).resize(192, 192).png().toFile(join(root, "public/brand/icon-192.png"));
  await sharp(src).resize(512, 512).png().toFile(join(root, "public/brand/icon-512.png"));
  await sharp(src).resize(180, 180).png().toFile(join(root, "public/brand/apple-touch-icon.png"));
  await sharp(src).resize(48, 48).png().toFile(join(root, "app/icon.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
