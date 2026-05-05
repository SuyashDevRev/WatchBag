import { router } from "../trpc/trpc.js";
import { authRouter } from "./auth.js";
import { healthRouter } from "./health.js";
import { reviewRouter } from "./review.js";
import { showRouter } from "./show.js";
import { uploadRouter } from "./upload.js";
import { watchbagRouter } from "./watchbag.js";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  watchbag: watchbagRouter,
  show: showRouter,
  review: reviewRouter,
  upload: uploadRouter,
});

export type AppRouter = typeof appRouter;
