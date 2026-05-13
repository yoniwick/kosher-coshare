import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import { recipes } from "@/lib/db/schema/recipes";
import { ProfileEditor } from "@/components/profile/profile-editor";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile");

  const database = db();

  const [user] = await database.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  if (!user) redirect("/login");

  const [{ count }] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(recipes)
    .where(eq(recipes.authorId, session.user.id));

  return <ProfileEditor user={user} recipeCount={Number(count ?? 0)} />;
}
