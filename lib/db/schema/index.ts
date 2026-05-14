export * from "./auth";
export * from "./notifications";
export * from "./recipes";

import { relations } from "drizzle-orm";
import { accounts, sessions, users } from "./auth";
import { recipes } from "./recipes";

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  recipes: many(recipes),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
