import { z } from "zod";

export const matchRequestSchema = z.object({
  wish: z.string().trim().min(2, "请至少写下两个字").max(280, "愿望请控制在 280 字以内")
}).strict();

export const matchResponseSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  cardId: z.string().min(1),
  provider: z.literal("deterministic-local"),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1)
}).strict();

export type MatchRequest = z.infer<typeof matchRequestSchema>;
export type MatchResponse = z.infer<typeof matchResponseSchema>;
