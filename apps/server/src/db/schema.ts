import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Auth tables (shape dictated by Better Auth; we own them here so Drizzle
// migrations stay in one place).
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Domain tables
// ---------------------------------------------------------------------------

export const watchStatus = pgEnum("watch_status", ["current", "watched", "on_hold"]);

export const watchbags = pgTable("watchbags", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per TMDB title we've ever referenced. `tmdbId` + `mediaType` is the
// natural key; `id` is our own surrogate so we can link reviews to it.
export const shows = pgTable(
  "shows",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type").notNull(), // "movie" | "tv"
    title: text("title").notNull(),
    overview: text("overview"),
    posterPath: text("poster_path"),
    releaseDate: text("release_date"), // TMDB returns ISO date strings
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("shows_tmdb_media_idx").on(table.tmdbId, table.mediaType)],
);

// Join table — a watchbag has many shows, each with a status + ordering.
export const watchbagShows = pgTable(
  "watchbag_shows",
  {
    watchbagId: text("watchbag_id")
      .notNull()
      .references(() => watchbags.id, { onDelete: "cascade" }),
    showId: text("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),
    status: watchStatus("status").notNull().default("current"),
    position: integer("position").notNull().default(0),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.watchbagId, table.showId] })],
);

export const reviews = pgTable("reviews", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  showId: text("show_id")
    .notNull()
    .references(() => shows.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-10
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations (used by drizzle-orm's query builder for joins)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  watchbags: many(watchbags),
  sessions: many(sessions),
  accounts: many(accounts),
  reviews: many(reviews),
}));

export const watchbagsRelations = relations(watchbags, ({ one, many }) => ({
  author: one(users, { fields: [watchbags.authorId], references: [users.id] }),
  shows: many(watchbagShows),
}));

export const showsRelations = relations(shows, ({ many }) => ({
  watchbags: many(watchbagShows),
  reviews: many(reviews),
}));

export const watchbagShowsRelations = relations(watchbagShows, ({ one }) => ({
  watchbag: one(watchbags, { fields: [watchbagShows.watchbagId], references: [watchbags.id] }),
  show: one(shows, { fields: [watchbagShows.showId], references: [shows.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  author: one(users, { fields: [reviews.authorId], references: [users.id] }),
  show: one(shows, { fields: [reviews.showId], references: [shows.id] }),
}));

// ---------------------------------------------------------------------------
// Inferred types — handy for ctx / service code
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Watchbag = typeof watchbags.$inferSelect;
export type NewWatchbag = typeof watchbags.$inferInsert;
export type Show = typeof shows.$inferSelect;
export type NewShow = typeof shows.$inferInsert;
export type WatchbagShow = typeof watchbagShows.$inferSelect;
export type Review = typeof reviews.$inferSelect;
