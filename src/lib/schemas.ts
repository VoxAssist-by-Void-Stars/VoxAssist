import { z } from "zod";

export const scopeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("self"),
    owner: z.string().min(1),
  }),
  z.object({
    kind: z.literal("friend"),
    owner: z.string().min(1),
  }),
]);

export const askRequestSchema = z.object({
  question: z.string().min(1),
  scope: scopeSchema,
});

export const planRequestSchema = z.object({
  idea: z.string().min(1),
  scope: scopeSchema,
});

export const ingestRequestSchema = z.object({
  vault: z.string().min(1),
  owner: z.string().min(1).optional(),
  shared: z.boolean().optional(),
});
