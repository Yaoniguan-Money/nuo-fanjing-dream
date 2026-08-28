import { z } from "zod";

export const interpretationSchema = z.object({
  title: z.string().min(1),
  sign: z.string().min(1),
  reflection: z.string().min(1),
  actions: z.array(z.string().min(1)).min(1).max(3),
  boundary: z.string().min(1)
}).strict();

export type Interpretation = z.infer<typeof interpretationSchema>;
