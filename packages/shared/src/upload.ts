import { z } from "zod";
import { UploadKind } from "./enums.js";

export const SignImageUploadInput = z.object({ kind: UploadKind });
export type SignImageUploadInput = z.infer<typeof SignImageUploadInput>;

// What the server sends back — typed so the web app can consume it directly.
export const SignedUpload = z.object({
  cloudName: z.string(),
  apiKey: z.string(),
  timestamp: z.number(),
  signature: z.string(),
  folder: z.string(),
  uploadUrl: z.string().url(),
});
export type SignedUpload = z.infer<typeof SignedUpload>;
