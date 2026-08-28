import { z } from "zod";
import { interpretationSchema } from "./schema";

export const interpretRequestSchema = z.object({
  cardId: z.string().min(1),
  wish: z.string().trim().min(2).max(280)
}).strict();

export const interpretResponseSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  cardId: z.string().min(1),
  provider: z.literal("deterministic-local"),
  interpretation: interpretationSchema
}).strict();

export type InterpretRequest = z.infer<typeof interpretRequestSchema>;
export type InterpretResponse = z.infer<typeof interpretResponseSchema>;
