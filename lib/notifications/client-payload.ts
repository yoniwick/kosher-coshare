import { getNotificationPreview } from "@/lib/notifications/data";

export type NotificationClientPayload = {
  unreadCount: number;
  items: Array<{
    id: string;
    type: "COMMENT" | "VOTE";
    readAt: string | null;
    createdAt: string;
    recipeSlug: string;
    recipeTitle: string;
    actorName: string | null;
    actorUsername: string | null;
  }>;
};

export function toNotificationClientPayload(
  data: Awaited<ReturnType<typeof getNotificationPreview>>
): NotificationClientPayload {
  return {
    unreadCount: data.unreadCount,
    items: data.items.map((i) => ({
      id: i.id,
      type: i.type,
      readAt: i.readAt ? i.readAt.toISOString() : null,
      createdAt: i.createdAt.toISOString(),
      recipeSlug: i.recipeSlug,
      recipeTitle: i.recipeTitle,
      actorName: i.actorName,
      actorUsername: i.actorUsername,
    })),
  };
}
