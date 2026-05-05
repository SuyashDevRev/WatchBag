import { TRPCError } from "@trpc/server";
import { and, asc, eq, max, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { shows, watchbagShows } from "../db/schema.js";
import { getTitle, searchMulti } from "../services/tmdb.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/trpc.js";
import { assertOwnsWatchbag } from "./watchbag.js";

const mediaTypeSchema = z.enum(["movie", "tv"]);
const statusSchema = z.enum(["current", "watched", "on_hold"]);

const addToBagSchema = z.object({
  watchbagId: z.string().uuid(),
  tmdbId: z.number().int().positive(),
  mediaType: mediaTypeSchema,
  status: statusSchema.default("current"),
});

const bagShowPairSchema = z.object({
  watchbagId: z.string().uuid(),
  showId: z.string().uuid(),
});

const moveSchema = z.object({
  watchbagId: z.string().uuid(),
  showId: z.string().uuid(),
  status: statusSchema,
  position: z.number().int().min(0),
});

// Upsert the TMDB title into our `shows` table. Returns the local `shows.id`.
async function upsertShow(tmdbId: number, mediaType: "movie" | "tv") {
  const existing = await db.query.shows.findFirst({
    where: and(eq(shows.tmdbId, tmdbId), eq(shows.mediaType, mediaType)),
  });
  if (existing) return existing;

  const detail = await getTitle(tmdbId, mediaType);
  const [row] = await db
    .insert(shows)
    .values({
      tmdbId: detail.tmdbId,
      mediaType: detail.mediaType,
      title: detail.title,
      overview: detail.overview,
      posterPath: detail.posterPath,
      releaseDate: detail.releaseDate,
    })
    .returning();
  if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return row;
}

export const showRouter = router({
  // TMDB multi-search (movies + TV). Anyone can search.
  search: publicProcedure
    .input(z.object({ query: z.string().trim().min(1).max(200), page: z.number().int().min(1).max(20).default(1) }))
    .query(async ({ input }) => {
      return searchMulti(input.query, input.page);
    }),

  // Fetch a single title by (tmdbId, mediaType). Caches through our LRU.
  getByTmdb: publicProcedure
    .input(z.object({ tmdbId: z.number().int().positive(), mediaType: mediaTypeSchema }))
    .query(({ input }) => getTitle(input.tmdbId, input.mediaType)),

  // Add a TMDB title to a watchbag (upserts into `shows`, then inserts into the
  // join table). Appends to the end of the chosen status column.
  addToBag: protectedProcedure.input(addToBagSchema).mutation(async ({ ctx, input }) => {
    await assertOwnsWatchbag(input.watchbagId, ctx.user.id);

    const show = await upsertShow(input.tmdbId, input.mediaType);

    // Max position among existing rows of the same status → new row goes at the end.
    const maxRows = await db
      .select({ maxPos: max(watchbagShows.position) })
      .from(watchbagShows)
      .where(
        and(eq(watchbagShows.watchbagId, input.watchbagId), eq(watchbagShows.status, input.status)),
      );

    const nextPosition = (maxRows[0]?.maxPos ?? -1) + 1;

    const [row] = await db
      .insert(watchbagShows)
      .values({
        watchbagId: input.watchbagId,
        showId: show.id,
        status: input.status,
        position: nextPosition,
      })
      .onConflictDoUpdate({
        target: [watchbagShows.watchbagId, watchbagShows.showId],
        set: { status: input.status, position: nextPosition },
      })
      .returning();

    return { show, link: row };
  }),

  // Remove a show from a watchbag.
  removeFromBag: protectedProcedure.input(bagShowPairSchema).mutation(async ({ ctx, input }) => {
    await assertOwnsWatchbag(input.watchbagId, ctx.user.id);
    await db
      .delete(watchbagShows)
      .where(
        and(
          eq(watchbagShows.watchbagId, input.watchbagId),
          eq(watchbagShows.showId, input.showId),
        ),
      );
    return { ok: true as const };
  }),

  // Drag-and-drop. Bumps everything in the target column at-or-after `position`
  // by one so the moved row can slot in. The source column's positions are
  // left unchanged — they collapse naturally on next read via ORDER BY.
  moveStatus: protectedProcedure.input(moveSchema).mutation(async ({ ctx, input }) => {
    await assertOwnsWatchbag(input.watchbagId, ctx.user.id);

    await db.transaction(async (tx) => {
      await tx
        .update(watchbagShows)
        .set({ position: sql`${watchbagShows.position} + 1` })
        .where(
          and(
            eq(watchbagShows.watchbagId, input.watchbagId),
            eq(watchbagShows.status, input.status),
            sql`${watchbagShows.position} >= ${input.position}`,
          ),
        );

      await tx
        .update(watchbagShows)
        .set({ status: input.status, position: input.position })
        .where(
          and(
            eq(watchbagShows.watchbagId, input.watchbagId),
            eq(watchbagShows.showId, input.showId),
          ),
        );
    });

    return { ok: true as const };
  }),

  // Dev helper — list the join rows for a bag, grouped by status.
  listInBag: publicProcedure
    .input(z.object({ watchbagId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db
        .select({
          showId: watchbagShows.showId,
          status: watchbagShows.status,
          position: watchbagShows.position,
          title: shows.title,
          posterPath: shows.posterPath,
          tmdbId: shows.tmdbId,
          mediaType: shows.mediaType,
        })
        .from(watchbagShows)
        .innerJoin(shows, eq(watchbagShows.showId, shows.id))
        .where(eq(watchbagShows.watchbagId, input.watchbagId))
        .orderBy(asc(watchbagShows.status), asc(watchbagShows.position));
    }),
});
