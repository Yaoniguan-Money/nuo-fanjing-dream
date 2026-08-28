import { z } from "zod";
import { interpretationSchema } from "@/domain/interpretation";
import { matchResponseSchema } from "./match-schema";

export const dreamSessionSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  sessionId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(["matched", "dream-completed", "interpreted"]),
  wish: z.string().min(2).max(280),
  match: matchResponseSchema,
  playback: z.object({
    completedAt: z.string().datetime().nullable()
  }).strict(),
  interpretation: interpretationSchema.nullable()
}).strict();

export type DreamSession = z.infer<typeof dreamSessionSchema>;

export function createDreamSession(wish: string, match: z.infer<typeof matchResponseSchema>, now = new Date()): DreamSession {
  const timestamp = now.toISOString();
  return dreamSessionSchema.parse({
    schemaVersion: "1.0.0",
    sessionId: globalThis.crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "matched",
    wish,
    match,
    playback: { completedAt: null },
    interpretation: null
  });
}
