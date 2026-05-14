import { auth } from "@/auth";

export async function requireSignedInUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return { userId: session.user.id, email: session.user.email ?? null };
}
