import { z } from "zod";

export const MediaType = z.enum(["movie", "tv"]);
export type MediaType = z.infer<typeof MediaType>;

export const WatchStatus = z.enum(["current", "watched", "on_hold"]);
export type WatchStatus = z.infer<typeof WatchStatus>;

export const UploadKind = z.enum(["avatar", "cover"]);
export type UploadKind = z.infer<typeof UploadKind>;
