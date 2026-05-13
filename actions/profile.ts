"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import { profileUpdateSchema } from "@/lib/validators/recipe";

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

  await database.update(users).set(patch).where(eq(users.id, session.user.id));

  revalidatePath("/profile");
  return { success: true as const };
}
