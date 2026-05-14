"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema/notifications";
import { getNotificationPreview } from "@/lib/notifications/data";
import { toNotificationClientPayload } from "@/lib/notifications/client-payload";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function refreshNotificationsAction() {
  const userId = await requireUserId();
  return toNotificationClientPayload(await getNotificationPreview(userId));
}

export async function markAllNotificationsReadAction() {
  const userId = await requireUserId();
  const database = db();
  const now = new Date();
  await database
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
  revalidatePath("/", "layout");
}
