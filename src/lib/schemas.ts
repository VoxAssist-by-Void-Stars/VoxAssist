import { z } from "zod";

/** Optional friend target; Scope.owner is never taken from the client. */
export const askRequestSchema = z.object({
  question: z.string().min(1),
  /** Friend username lookup → friend scope; omit for self. */
  username: z.string().min(1).optional(),
});

export const planRequestSchema = z.object({
  idea: z.string().min(1),
  username: z.string().min(1).optional(),
});

export const ingestRequestSchema = z.object({
  vault: z.string().min(1),
  owner: z.string().min(1).optional(),
  shared: z.boolean().optional(),
});

export const ttsRequestSchema = z.object({
  text: z.string().min(1).max(5000),
});
