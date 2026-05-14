import { alias } from "drizzle-orm/pg-core";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import { notifications } from "@/lib/db/schema/notifications";
import { recipes } from "@/lib/db/schema/recipes";

export type NotificationPreviewItem = {
  id: string;
  type: "COMMENT" | "VOTE";
  readAt: Date | null;
  createdAt: Date;
  recipeSlug: string;
  recipeTitle: string;
  actorName: string | null;
  actorUsername: string | null;
};

export async function getNotificationPreview(userId: string, limit = 40) {
  const database = db();
  const actor = alias(users, "notification_actor");

  const [unreadAgg] = await database
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));

  const unreadCount = Number(unreadAgg?.n ?? 0);

  const rows = await database
    .select({
      id: notifications.id,
      type: notifications.type,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
      recipeSlug: recipes.slug,
      recipeTitle: recipes.title,
      actorName: actor.name,
      actorUsername: actor.username,
    })
    .from(notifications)
    .innerJoin(recipes, eq(notifications.recipeId, recipes.id))
    .innerJoin(actor, eq(notifications.actorId, actor.id))
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return { items: rows, unreadCount };
}
