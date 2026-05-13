import Link from "next/link";
import { auth } from "@/auth";
import { listAuthorRecipes } from "@/lib/recipes/my-recipes";
import { MyRecipeRow } from "@/components/recipe/my-recipe-row";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MyRecipesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="rounded-3xl border border-[color:var(--line)] bg-white/70 p-10 text-center shadow-soft">
        <p className="font-serif text-2xl text-[color:var(--ink)]">Your recipes</p>
        <p className="mt-2 text-sm text-[color:var(--ink-muted)]">Sign in to see everything you have composed.</p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="vermilion" className="rounded-2xl">
            <Link href="/login?callbackUrl=/my-recipes">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const items = await listAuthorRecipes(session.user.id);

  return (
    <div className="space-y-8 pb-14">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--ink-muted)]">Library</p>
        <h1 className="font-serif text-4xl text-[color:var(--ink)]">Your recipes</h1>
        <p className="text-sm text-[color:var(--ink-muted)]">
          Drafts and published posts in one list. Edit opens the composer; published recipes can also be viewed live.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="vermilion" className="rounded-2xl">
          <Link href="/post">New recipe</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[color:var(--line)] bg-white/60 p-10 text-center">
          <p className="text-[color:var(--ink-muted)]">You have not created a recipe yet.</p>
          <div className="mt-6 flex justify-center">
            <Button asChild variant="vermilion" className="rounded-2xl">
              <Link href="/post">Start composing</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((r) => (
            <li key={r.id}>
              <MyRecipeRow recipe={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
