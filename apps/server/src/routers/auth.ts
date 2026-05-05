import { protectedProcedure, publicProcedure, router } from "../trpc/trpc.js";

export const authRouter = router({
  // Returns the current session + user, or `null` if anonymous. Useful for the
  // frontend to hydrate auth state on first load.
  me: publicProcedure.query(({ ctx }) => {
    if (!ctx.user || !ctx.session) return null;
    return {
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        image: ctx.user.image,
      },
      session: {
        id: ctx.session.id,
        expiresAt: ctx.session.expiresAt,
      },
    };
  }),

  // Protected echo — anything that can call this proves the cookie is valid.
  whoami: protectedProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    email: ctx.user.email,
  })),
});
