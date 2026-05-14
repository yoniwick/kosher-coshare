import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import {
  bookmarks,
  comments,
  recipeImages,
  recipeSpecialBadges,
  recipeTags,
  recipes,
  tags,
  votes,
} from "@/lib/db/schema/recipes";
import { buildCommentTree } from "@/lib/recipes/comment-tree";

export async function getRecipeDetail(slug: string, viewerId?: string | null) {
  const database = db();

  const [row] = await database
    .select({
      recipe: recipes,
      author: {
        id: users.id,
        name: users.name,
        image: users.image,
        username: users.username,
      },
    })
    .from(recipes)
    .innerJoin(users, eq(recipes.authorId, users.id))
    .where(eq(recipes.slug, slug))
    .limit(1);

  if (!row) return null;

  const [images, badgesRow, tagRows, votedRows, bookmarkRows, rawComments] =
    await Promise.all([
      database
        .select()
        .from(recipeImages)
        .where(eq(recipeImages.recipeId, row.recipe.id))
        .orderBy(asc(recipeImages.sortOrder)),
      database
        .select({ badge: recipeSpecialBadges.badge })
        .from(recipeSpecialBadges)
        .where(eq(recipeSpecialBadges.recipeId, row.recipe.id)),
      database
        .select({ name: tags.name })
        .from(recipeTags)
        .innerJoin(tags, eq(recipeTags.tagId, tags.id))
        .where(eq(recipeTags.recipeId, row.recipe.id)),
      viewerId
        ? database
            .select({ id: votes.userId })
            .from(votes)
            .where(and(eq(votes.recipeId, row.recipe.id), eq(votes.userId, viewerId)))
            .limit(1)
        : Promise.resolve([]),
      viewerId
        ? database
            .select({ id: bookmarks.userId })
            .from(bookmarks)
            .where(and(eq(bookmarks.recipeId, row.recipe.id), eq(bookmarks.userId, viewerId)))
            .limit(1)
        : Promise.resolve([]),
      database
        .select({
          id: comments.id,
          body: comments.body,
          createdAt: comments.createdAt,
          authorId: comments.authorId,
          parentId: comments.parentId,
          authorName: users.name,
          authorImage: users.image,
          authorUsername: users.username,
        })
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .where(eq(comments.recipeId, row.recipe.id))
        .orderBy(asc(comments.createdAt)),
    ]);

  return {
    recipe: row.recipe,
    author: row.author,
    images,
    badges: badgesRow.map((b) => b.badge),
    tags: tagRows.map((t) => t.name),
    hasVoted: viewerId ? votedRows.length > 0 : false,
    bookmarked: viewerId ? bookmarkRows.length > 0 : false,
    commentTree: buildCommentTree(rawComments),
  };
}
