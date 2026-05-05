import { z } from "zod";
import { MediaType, WatchStatus } from "./enums.js";

export const SearchShowsInput = z.object({
  query: z.string().trim().min(1).max(200),
  page: z.number().int().min(1).max(20).default(1),
});
export type SearchShowsInput = z.infer<typeof SearchShowsInput>;

export const GetByTmdbInput = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: MediaType,
});
export type GetByTmdbInput = z.infer<typeof GetByTmdbInput>;

export const AddToBagInput = z.object({
  watchbagId: z.string().uuid(),
  tmdbId: z.number().int().positive(),
  mediaType: MediaType,
  status: WatchStatus.default("current"),
});
export type AddToBagInput = z.infer<typeof AddToBagInput>;

export const BagShowPair = z.object({
  watchbagId: z.string().uuid(),
  showId: z.string().uuid(),
});
export type BagShowPair = z.infer<typeof BagShowPair>;

export const MoveStatusInput = z.object({
  watchbagId: z.string().uuid(),
  showId: z.string().uuid(),
  status: WatchStatus,
  position: z.number().int().min(0),
});
export type MoveStatusInput = z.infer<typeof MoveStatusInput>;
