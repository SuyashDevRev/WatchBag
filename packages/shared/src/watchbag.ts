import { z } from "zod";

export const WatchbagId = z.object({ id: z.string().uuid() });
export type WatchbagIdInput = z.infer<typeof WatchbagId>;

export const CreateWatchbagInput = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  coverImageUrl: z.string().url().optional(),
  isPublic: z.boolean().default(false),
});
export type CreateWatchbagInput = z.infer<typeof CreateWatchbagInput>;

export const UpdateWatchbagInput = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  isPublic: z.boolean().optional(),
});
export type UpdateWatchbagInput = z.infer<typeof UpdateWatchbagInput>;

export const SetPublicInput = z.object({
  id: z.string().uuid(),
  isPublic: z.boolean(),
});
export type SetPublicInput = z.infer<typeof SetPublicInput>;
