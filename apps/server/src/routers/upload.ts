import { SignImageUploadInput } from "@watchbag/shared";

import { signUpload } from "../services/cloudinary.js";
import { protectedProcedure, router } from "../trpc/trpc.js";

export const uploadRouter = router({
  signImageUpload: protectedProcedure
    .input(SignImageUploadInput)
    .mutation(({ ctx, input }) => {
      const folder = `watchbag/${input.kind}/${ctx.user.id}`;
      return signUpload(folder);
    }),
});
