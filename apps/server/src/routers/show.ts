import { TRPCError } from "@trpc/server";
import { and, asc, eq, max, sql } from "drizzle-orm";
import { z } from "zod";
import {
  AddToBagInput,
  BagShowPair,
  GetByTmdbInput,
  MoveStatusInput,
  SearchShowsInput,
  type MediaType,
} from "@watchbag/shared";

import { db } from "../db/index.js";
import { shows, watchbagShows } from "../db/schema.js";
import {
  getPopularMovies,
  getPopularTv,
  getTitle,
  getTrending,
  searchMulti,
} from "../services/tmdb.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/trpc.js";
import { assertOwnsWatchbag } from "./watchbag.js";

async function upsertShow(tmdbId: number, mediaType: MediaType) {
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
  search: publicProcedure.input(SearchShowsInput).query(({ input }) => {
    return searchMulti(input.query, input.page);
  }),

  // Homepage rails — TMDB-backed discovery lists.
  trending: publicProcedure
    .input(z.object({ window: z.enum(["day", "week"]).default("day") }).optional())
    .query(({ input }) => getTrending(input?.window ?? "day")),

  popularMovies: publicProcedure.query(() => getPopularMovies()),

  popularTv: publicProcedure.query(() => getPopularTv()),

  getByTmdb: publicProcedure.input(GetByTmdbInput).query(({ input }) => {
    return getTitle(input.tmdbId, input.mediaType);
  }),

  addToBag: protectedProcedure.input(AddToBagInput).mutation(async ({ ctx, input }) => {
    await assertOwnsWatchbag(input.watchbagId, ctx.user.id);

    const show = await upsertShow(input.tmdbId, input.mediaType);

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

  removeFromBag: protectedProcedure.input(BagShowPair).mutation(async ({ ctx, input }) => {
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

  moveStatus: protectedProcedure.input(MoveStatusInput).mutation(async ({ ctx, input }) => {
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
