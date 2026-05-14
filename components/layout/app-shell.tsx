import { auth } from "@/auth";
import { MobileShell } from "@/components/layout/mobile-shell";
import { toNotificationClientPayload } from "@/lib/notifications/client-payload";
import { getNotificationPreview } from "@/lib/notifications/data";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const notificationInitial = userId
    ? toNotificationClientPayload(await getNotificationPreview(userId))
    : null;

  return (
    <MobileShell signedIn={Boolean(session)} notificationInitial={notificationInitial}>
      {children}
    </MobileShell>
  );
}
