"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import { profileUpdateSchema } from "@/lib/validators/recipe";

function extractPostgresCode(err: unknown): string {
  let cur: unknown = err;
  for (let i = 0; i < 6 && cur; i++) {
    if (typeof cur === "object" && cur !== null) {
      const o = cur as { code?: unknown; cause?: unknown };
      if (o.code != null) return String(o.code);
      cur = o.cause;
    } else break;
  }
  return "";
}

export async function updateProfileAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const database = db();
  const patch: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.data.username !== undefined) {
    patch.username = parsed.data.username === "" ? null : parsed.data.username;
  }
  if (parsed.data.bio !== undefined) {
    patch.bio = parsed.data.bio;
  }

  try {
    await database.update(users).set(patch).where(eq(users.id, session.user.id));
  } catch (err) {
    const code = extractPostgresCode(err);
    const message = err instanceof Error ? err.message : String(err);
    if (code === "23505" || /duplicate key|unique constraint/i.test(message)) {
      return {
        success: false as const,
        error: { username: ["That username is already taken."] },
      };
    }
    throw err;
  }

  revalidatePath("/profile");
  return { success: true as const };
}
