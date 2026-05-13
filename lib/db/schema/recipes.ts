import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const kosherCategoryEnum = pgEnum("kosher_category", ["MEAT", "DAIRY", "PAREVE"]);
export const recipeStatusEnum = pgEnum("recipe_status", ["DRAFT", "PUBLISHED"]);
export const difficultyEnum = pgEnum("difficulty", ["EASY", "MEDIUM", "HARD"]);
export const mealTypeEnum = pgEnum("meal_type", [
  "APPETIZER",
  "MAIN",
  "SIDE",
  "SOUP",
  "SALAD",
  "DESSERT",
  "DRINK",
  "SNACK",
  "OTHER",
]);
export const specialBadgeEnum = pgEnum("special_badge", ["NUT_FREE", "PESACH", "GLUTEN_FREE"]);

export type IngredientRow = { item: string; amount: string; notes?: string };
export type StepRow = { stepNumber: number; instruction: string };

export const recipes = pgTable(
  "recipe",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    rawInputText: text("raw_input_text").notNull().default(""),
    aiGeneratedJson: jsonb("ai_generated_json").$type<Record<string, unknown>>(),
    ingredientsNormalized: jsonb("ingredients_normalized").$type<IngredientRow[]>().notNull().default(sql`'[]'::jsonb`),
    stepsNormalized: jsonb("steps_normalized").$type<StepRow[]>().notNull().default(sql`'[]'::jsonb`),
    prepMinutes: integer("prep_minutes"),
    cookMinutes: integer("cook_minutes"),
    totalMinutes: integer("total_minutes"),
    servings: text("servings"),
    notes: text("notes"),
    cuisine: text("cuisine"),
    kosherCategory: kosherCategoryEnum("kosher_category").notNull(),
    difficulty: difficultyEnum("difficulty"),
    mealType: mealTypeEnum("meal_type"),
    status: recipeStatusEnum("status").notNull().default("DRAFT"),
    coverImageUrl: text("cover_image_url"),
    publishedAt: timestamp("published_at", { mode: "date" }),
    commentCount: integer("comment_count").notNull().default(0),
    voteCount: integer("vote_count").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => ({
    slugUnique: uniqueIndex("recipe_slug_unique").on(t.slug),
    authorIdx: index("recipe_author_idx").on(t.authorId),
    statusPubIdx: index("recipe_status_published_idx").on(t.status, t.publishedAt),
    kosherIdx: index("recipe_kosher_idx").on(t.kosherCategory),
    mealIdx: index("recipe_meal_idx").on(t.mealType),
    diffIdx: index("recipe_difficulty_idx").on(t.difficulty),
    voteIdx: index("recipe_vote_count_idx").on(t.voteCount),
    commentIdx: index("recipe_comment_count_idx").on(t.commentCount),
    totalTimeIdx: index("recipe_total_minutes_idx").on(t.totalMinutes),
  })
);

export const recipeImages = pgTable(
  "recipe_image",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    altText: text("alt_text"),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => ({
    recipeOrderIdx: index("recipe_image_recipe_sort_idx").on(t.recipeId, t.sortOrder),
  })
);

export const votes = pgTable(
  "vote",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.recipeId] }),
    recipeIdx: index("vote_recipe_idx").on(t.recipeId),
  })
);

export const comments = pgTable(
  "comment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (t) => ({
    recipeIdx: index("comment_recipe_idx").on(t.recipeId),
    authorIdx: index("comment_author_idx").on(t.authorId),
  })
);

export const tags = pgTable(
  "tag",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => ({
    normUnique: uniqueIndex("tag_normalized_unique").on(t.normalizedName),
    nameIdx: index("tag_name_idx").on(t.name),
  })
);

export const recipeTags = pgTable(
  "recipe_tag",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.recipeId, t.tagId] }),
    tagIdx: index("recipe_tag_tag_idx").on(t.tagId),
  })
);

export const recipeSpecialBadges = pgTable(
  "recipe_special_badge",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    badge: specialBadgeEnum("badge").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.recipeId, t.badge] }),
    badgeIdx: index("recipe_special_badge_badge_idx").on(t.badge),
  })
);

export const bookmarks = pgTable(
  "bookmark",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.recipeId] }),
    userIdx: index("bookmark_user_idx").on(t.userId),
  })
);

export const recipeReports = pgTable(
  "recipe_report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    resolved: boolean("resolved").notNull().default(false),
  },
  (t) => ({
    recipeIdx: index("recipe_report_recipe_idx").on(t.recipeId),
  })
);

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  author: one(users, {
    fields: [recipes.authorId],
    references: [users.id],
  }),
  images: many(recipeImages),
  votesList: many(votes),
  commentsList: many(comments),
  recipeTagsList: many(recipeTags),
  specialBadgesList: many(recipeSpecialBadges),
}));

export const recipeImagesRelations = relations(recipeImages, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeImages.recipeId],
    references: [recipes.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  recipe: one(recipes, {
    fields: [votes.recipeId],
    references: [recipes.id],
  }),
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  recipe: one(recipes, {
    fields: [comments.recipeId],
    references: [recipes.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  recipeTagsList: many(recipeTags),
}));

export const recipeTagsRelations = relations(recipeTags, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeTags.recipeId],
    references: [recipes.id],
  }),
  tag: one(tags, {
    fields: [recipeTags.tagId],
    references: [tags.id],
  }),
}));

export const recipeSpecialBadgesRelations = relations(recipeSpecialBadges, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeSpecialBadges.recipeId],
    references: [recipes.id],
  }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  recipe: one(recipes, {
    fields: [bookmarks.recipeId],
    references: [recipes.id],
  }),
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
}));
