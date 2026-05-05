import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import {
  CreateWatchbagInput,
  SetPublicInput,
  UpdateWatchbagInput,
  WatchbagId,
} from "@watchbag/shared";

import { db } from "../db/index.js";
import { watchbags, watchbagShows } from "../db/schema.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/trpc.js";

async function loadOwnedWatchbag(id: string, userId: string) {
  const [row] = await db.select().from(watchbags).where(eq(watchbags.id, id)).limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Watchbag not found" });
  }
  if (row.authorId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not your watchbag" });
  }
  return row;
}

export const watchbagRouter = router({
  explore: publicProcedure.query(async () => {
    return db.query.watchbags.findMany({
      where: eq(watchbags.isPublic, true),
      orderBy: [desc(watchbags.createdAt)],
      with: {
        author: { columns: { id: true, name: true, image: true } },
      },
      limit: 60,
    });
  }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    return db.query.watchbags.findMany({
      where: eq(watchbags.authorId, ctx.user.id),
      orderBy: [desc(watchbags.updatedAt)],
    });
  }),

  get: publicProcedure.input(WatchbagId).query(async ({ ctx, input }) => {
    const bag = await db.query.watchbags.findFirst({
      where: eq(watchbags.id, input.id),
      with: {
        author: { columns: { id: true, name: true, image: true } },
        shows: {
          orderBy: [watchbagShows.position],
          with: { show: true },
        },
      },
    });

    if (!bag) throw new TRPCError({ code: "NOT_FOUND" });

    if (!bag.isPublic && bag.authorId !== ctx.user?.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This watchbag is private" });
    }

    return bag;
  }),

  create: protectedProcedure.input(CreateWatchbagInput).mutation(async ({ ctx, input }) => {
    const [created] = await db
      .insert(watchbags)
      .values({
        authorId: ctx.user.id,
        title: input.title,
        description: input.description,
        coverImageUrl: input.coverImageUrl,
        isPublic: input.isPublic,
      })
      .returning();

    return created;
  }),

  update: protectedProcedure.input(UpdateWatchbagInput).mutation(async ({ ctx, input }) => {
    await loadOwnedWatchbag(input.id, ctx.user.id);

    const { id, ...patch } = input;
    const [updated] = await db
      .update(watchbags)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(watchbags.id, id))
      .returning();

    return updated;
  }),

  delete: protectedProcedure.input(WatchbagId).mutation(async ({ ctx, input }) => {
    await loadOwnedWatchbag(input.id, ctx.user.id);
    await db.delete(watchbags).where(eq(watchbags.id, input.id));
    return { ok: true as const };
  }),

  setPublic: protectedProcedure.input(SetPublicInput).mutation(async ({ ctx, input }) => {
    await loadOwnedWatchbag(input.id, ctx.user.id);
    const [updated] = await db
      .update(watchbags)
      .set({ isPublic: input.isPublic, updatedAt: new Date() })
      .where(eq(watchbags.id, input.id))
      .returning();
    return updated;
  }),
});

// Helper used by the show router to guard cross-table mutations.
export async function assertOwnsWatchbag(watchbagId: string, userId: string) {
  const [row] = await db
    .select({ authorId: watchbags.authorId })
    .from(watchbags)
    .where(eq(watchbags.id, watchbagId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Watchbag not found" });
  if (row.authorId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
}
