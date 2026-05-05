import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import { reviews } from "../db/schema.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/trpc.js";

const createSchema = z.object({
  showId: z.string().uuid(),
  rating: z.number().int().min(1).max(10),
  body: z.string().trim().max(4000).optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(1).max(10).optional(),
  body: z.string().trim().max(4000).nullable().optional(),
});

export const reviewRouter = router({
  // All reviews for a show, newest first. Includes the author display info.
  listForShow: publicProcedure
    .input(z.object({ showId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.query.reviews.findMany({
        where: eq(reviews.showId, input.showId),
        orderBy: [desc(reviews.createdAt)],
        with: {
          author: { columns: { id: true, name: true, image: true } },
        },
      });
    }),

  // Everything the caller has reviewed.
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return db.query.reviews.findMany({
      where: eq(reviews.authorId, ctx.user.id),
      orderBy: [desc(reviews.createdAt)],
      with: { show: true },
    });
  }),

  create: protectedProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
    const [row] = await db
      .insert(reviews)
      .values({
        authorId: ctx.user.id,
        showId: input.showId,
        rating: input.rating,
        body: input.body,
      })
      .returning();
    return row;
  }),

  update: protectedProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    const existing = await db.query.reviews.findFirst({ where: eq(reviews.id, input.id) });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (existing.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

    const { id, ...patch } = input;
    const [row] = await db
      .update(reviews)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return row;
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.reviews.findFirst({ where: eq(reviews.id, input.id) });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      await db.delete(reviews).where(eq(reviews.id, input.id));
      return { ok: true as const };
    }),
});
