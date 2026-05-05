import { z } from "zod";

export const CreateReviewInput = z.object({
  showId: z.string().uuid(),
  rating: z.number().int().min(1).max(10),
  body: z.string().trim().max(4000).optional(),
});
export type CreateReviewInput = z.infer<typeof CreateReviewInput>;

export const UpdateReviewInput = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(1).max(10).optional(),
  body: z.string().trim().max(4000).nullable().optional(),
});
export type UpdateReviewInput = z.infer<typeof UpdateReviewInput>;

export const ReviewId = z.object({ id: z.string().uuid() });
export type ReviewIdInput = z.infer<typeof ReviewId>;
