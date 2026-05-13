# CoShare (Kosher recipe community)

Production-oriented **Next.js App Router** app for a kosher **CoShare** community: fast posting, AI-assisted structuring (OpenRouter), Neon Postgres + Drizzle, Google auth (Auth.js), multi-image uploads (Vercel Blob), votes, comments, bookmarks, search/filtering, mobile-first UI, and **PWA + Capacitor-ready** packaging notes.

---

## Phase 1 — Architecture & planning

### Architecture

- **Framework**: Next.js (App Router) + TypeScript (strict)
- **UI**: Tailwind CSS + small local component library inspired by shadcn patterns (Radix Slot / CVA), plus **sonner** toasts
- **Data**: **Neon Postgres** via `@neondatabase/serverless` + **Drizzle ORM**
- **Auth**: **Auth.js / `next-auth` v5** with **Google** provider + **Drizzle adapter** (`user`, `account`, `session`, `verificationToken`)
- **AI**: **OpenRouter** Chat Completions API + strict **Zod** validation of JSON output (stored as `aiGeneratedJson` + normalized editable columns)
- **Images**: **Vercel Blob** (`put`) behind `BLOB_READ_WRITE_TOKEN` — practical default on Vercel; swap the upload action later if you prefer UploadThing / R2 / Supabase Storage (keep the storage calls isolated)
- **Hosting**: Vercel (serverless-friendly HTTP Neon driver)

### Entities & relationships (high level)

- **`user`**: Auth.js user row extended with `username`, `bio`
- **`recipe`**: core recipe record with draft/published workflow, kosher category + structured JSON fields
- **`recipe_image`**: ordered photos per recipe
- **`vote`**: composite PK `(userId, recipeId)` (one vote per user per recipe)
- **`comment`**: threaded body with soft-delete (`deletedAt`)
- **`tag` + `recipe_tag`**: normalized tags + join
- **`recipe_special_badge`**: optional badges as relational rows (filter-friendly)
- **`bookmark`**: saved recipes per user
- **`recipe_report`**: lightweight moderation scaffold

### Folder structure (high level)

- `app/` — routes + route handlers (`app/api/auth`)
- `actions/` — server actions (mutations + search bridge)
- `components/` — UI + feature components (`features` split implicitly by folders like `components/recipe`)
- `lib/` — db, AI, search/query helpers, validators, utilities
- `drizzle/` — seed script (`drizzle/seed.ts`) + generated migrations (after you run generate)
- `types/` — ambient typing (`next-auth` augmentation)

### Major routes

| Route | Purpose |
| --- | --- |
| `/` | Home feed (new + popular) |
| `/search` | Live search + chips + sort |
| `/post` | Composer (draft autosave, AI, publish) |
| `/recipe/[slug]` | Recipe detail (gallery, badges, AI-shaped body, vote/comment/save/share) |
| `/saved` | Bookmarks |
| `/profile` | Edit **your** profile |
| `/profile/[username]` | Public profile |
| `/login` | Google sign-in |

### Search strategy (MVP)

- Tokenized query across **title**, **description**, **ingredients JSON**, **steps JSON**, **cuisine**, plus **tag** matches via `exists` subquery
- Indexed filters: **kosher category**, optional **special badges** (relational exists per badge), **meal type**, **difficulty**, **total time**
- Sorting: newest / most votes / most comments
- Pagination: cursor as numeric offset string (simple MVP)

**Upgrade path**: add `pg_trgm` + trigram indexes on hot text columns, or a generated `tsvector` column maintained by trigger.

### AI integration strategy

- Server-only calls to OpenRouter (`OPENROUTER_API_KEY`), model configurable (`OPENROUTER_MODEL`)
- Prompt enforces conservative behavior: **no invented kashrut claims**, respect selected badges/category as metadata only
- Output validated by **Zod** before persisting
- Raw author note preserved in `rawInputText`; structured AI payload saved into `aiGeneratedJson` for audit/debug

### Implementation assumptions

- **Votes/comments**: optimistic UI on the client; authoritative counts stored on `recipe` (`voteCount`, `commentCount`) for fast feeds
- **Drafts**: `recipe.status = DRAFT` — drafts are only visible to the author on `/recipe/[slug]`
- **Slug**: regenerated from title on first publish from draft
- **Rate limits**: in-memory token buckets for MVP (`lib/rate-limit.ts`) — swap for Upstash later using existing env placeholders

---

## Local development

### 1) Install

```bat
cd /d c:\dev\Kosher CoShare
npm install
```

### 2) Configure env

Copy `env.example` → `.env.local` and fill values.

**Minimum to boot**:

- `DATABASE_URL` (**must** match Neon’s expected URL shape; required when importing modules that initialize Neon)
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
- `NEXT_PUBLIC_APP_URL` / `AUTH_URL` (usually `http://localhost:3000` locally)

### 3) Push schema (development)

```bat
cd /d c:\dev\Kosher CoShare
npm run db:push
```

### 4) Seed (optional)

```bat
cd /d c:\dev\Kosher CoShare
npm run db:seed
```

### 5) Run

```bat
cd /d c:\dev\Kosher CoShare
npm run dev
```

---

## Migrations (production-friendly workflow)

For production, prefer generating SQL migrations:

```bat
cd /d c:\dev\Kosher CoShare
npm run db:generate
npm run db:migrate
```

Neon tip: enable connection pooling if you expect bursts from server actions.

---

## Image storage choice (Vercel Blob)

We use **Vercel Blob** because it pairs cleanly with Vercel deployments: single env token, fast public URLs, minimal glue code. Alternatives:

- **UploadThing**: excellent DX for uploads + callbacks
- **Cloudflare R2**: great economics at scale
- **Supabase Storage**: strong if you already run Supabase

Keep uploads behind `actions/recipes.ts` so swapping providers is localized.

---

## PWA notes

- `public/manifest.json` registers the installable web app shell
- `public/sw.js` performs a minimal offline fallback (`public/offline.html`)
- `components/pwa/register-sw.tsx` registers the service worker **in production only**

**Icons**: add PNG icons later (192/512) and reference them from `manifest.json` for best install UX.

### Run as installed PWA

- Deploy with HTTPS (Vercel does this automatically)
- Visit the site → browser “Install” / “Add to Home Screen”

---

## Capacitor packaging (iOS / Android) notes

This repo stays **web-first**:

- Avoid browser-only APIs on critical paths (uploads use standard `FormData`)
- Keep absolute URLs configurable via `NEXT_PUBLIC_APP_URL`
- For native builds, follow Capacitor’s official flow (`npm install @capacitor/core @capacitor/cli`, `npx cap init`, add iOS/Android platforms)

### Google auth on packaged apps

OAuth redirects must match the **exact** redirect URIs registered in Google Cloud:

- Add your production URL callback routes used by Auth.js
- For Capacitor, you typically use a **custom URL scheme** or **HTTPS app links** as redirect targets; plan on adjusting Auth.js `trustHost` + provider callback URLs accordingly before shipping stores

---

## Deployment (Vercel)

1. Create Neon database + copy pooled connection string → `DATABASE_URL`
2. Set Auth.js env vars + Google OAuth client (authorized redirect URIs from Auth.js)
3. Create Blob store token → `BLOB_READ_WRITE_TOKEN`
4. Add OpenRouter key + optional model override
5. `SKIP_ENV_VALIDATION` should remain **unset** in production (validation helps catch misconfig early)

---

## Continue development in Cursor

- Schema & queries live in `lib/db/schema/*` and `lib/recipes/*`
- Mutations live in `actions/*`
- Keep server-only secrets out of client components (already enforced via server actions / route handlers)

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push Drizzle schema (dev) |
| `npm run db:generate` | Generate SQL migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed helper data |

---

## Security notes

- Owner-only edits enforced in server actions by comparing `recipe.authorId` to session user id
- Comments support deletion by author (soft delete placeholder)
- Reporting scaffold via `recipe_report`

---

## Name / branding

“CoShare” is a working name — swap copy in `app/layout.tsx` metadata and `public/manifest.json`.
