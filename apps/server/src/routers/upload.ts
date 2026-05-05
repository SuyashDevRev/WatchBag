import { z } from "zod";

import { signUpload } from "../services/cloudinary.js";
import { protectedProcedure, router } from "../trpc/trpc.js";

const kindSchema = z.enum(["avatar", "cover"]);

export const uploadRouter = router({
  // Returns Cloudinary upload params the browser can POST to directly.
  // Keeps the secret on the server; signature is single-use within ~1hr.
  signImageUpload: protectedProcedure
    .input(z.object({ kind: kindSchema }))
    .mutation(({ ctx, input }) => {
      const folder = `watchbag/${input.kind}/${ctx.user.id}`;
      return signUpload(folder);
    }),
});
