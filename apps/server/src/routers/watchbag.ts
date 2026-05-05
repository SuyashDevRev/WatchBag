import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { watchbags, watchbagShows } from "../db/schema.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/trpc.js";

const watchbagIdSchema = z.object({ id: z.string().uuid() });

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  coverImageUrl: z.string().url().optional(),
  isPublic: z.boolean().default(false),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  isPublic: z.boolean().optional(),
});

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
  // Public feed — every public watchbag, newest first.
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

  // All watchbags the caller owns.
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return db.query.watchbags.findMany({
      where: eq(watchbags.authorId, ctx.user.id),
      orderBy: [desc(watchbags.updatedAt)],
    });
  }),

  // Single watchbag detail, including its shows grouped by status.
  // Public watchbags are visible to everyone; private ones only to the owner.
  get: publicProcedure.input(watchbagIdSchema).query(async ({ ctx, input }) => {
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

  create: protectedProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
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

  update: protectedProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    await loadOwnedWatchbag(input.id, ctx.user.id);

    const { id, ...patch } = input;
    const [updated] = await db
      .update(watchbags)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(watchbags.id, id))
      .returning();

    return updated;
  }),

  delete: protectedProcedure.input(watchbagIdSchema).mutation(async ({ ctx, input }) => {
    await loadOwnedWatchbag(input.id, ctx.user.id);
    await db.delete(watchbags).where(eq(watchbags.id, input.id));
    return { ok: true as const };
  }),

  // Toggle-or-set public/private.
  setPublic: protectedProcedure
    .input(z.object({ id: z.string().uuid(), isPublic: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await loadOwnedWatchbag(input.id, ctx.user.id);
      const [updated] = await db
        .update(watchbags)
        .set({ isPublic: input.isPublic, updatedAt: new Date() })
        .where(eq(watchbags.id, input.id))
        .returning();
      return updated;
    }),
});

// Helper used by other routers (e.g. the show router adds items to a bag).
export async function assertOwnsWatchbag(watchbagId: string, userId: string) {
  const [row] = await db
    .select({ authorId: watchbags.authorId })
    .from(watchbags)
    .where(eq(watchbags.id, watchbagId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Watchbag not found" });
  if (row.authorId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
}

