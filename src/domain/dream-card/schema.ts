import { z } from "zod";

const identifierSchema = z.string().regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);
const uniqueStringsSchema = z.array(z.string().min(1)).superRefine((values, context) => {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", message: "列表项必须唯一" });
  }
});

export const dreamTextSchema = z.object({
  id: z.string().regex(/^act-[0-9]{2}-text-[0-9]{2}$/),
  content: z.string().min(1),
  speakerId: identifierSchema,
  display: z.object({
    mode: z.enum(["instant", "typewriter"]),
    advance: z.enum(["manual", "auto"])
  }).strict(),
  extensions: z.object({
    sourceType: z.string().optional(),
    speakerName: z.string().optional(),
    self: z.boolean().optional(),
    mystic: z.boolean().optional()
  }).catchall(z.unknown())
}).strict();

export const dreamActSchema = z.object({
  id: z.string().regex(/^act-[0-9]{2}$/),
  title: z.string().min(1),
  backgroundAssetId: identifierSchema,
  characters: z.array(z.object({
    instanceId: identifierSchema,
    assetId: identifierSchema,
    position: z.enum(["left", "center", "right"])
  }).strict()).max(3),
  texts: z.array(dreamTextSchema),
  choices: z.array(z.never()).max(0),
  notes: z.string()
}).strict();

export const dreamCardSchema = z.object({
  $schema: z.string().min(1),
  schemaVersion: z.literal("0.1.0"),
  meta: z.object({
    id: z.string().regex(/^dream\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
    version: z.string().regex(/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/),
    title: z.string().min(1),
    synopsis: z.string().min(1),
    match: z.object({
      tags: uniqueStringsSchema,
      situations: uniqueStringsSchema,
      emotions: uniqueStringsSchema,
      dilemmas: uniqueStringsSchema,
      relationships: uniqueStringsSchema,
      excludeTags: uniqueStringsSchema
    }).strict(),
    officeCandidates: z.array(z.object({
      officeId: z.string().regex(/^office\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
      fit: z.number().min(0).max(1),
      reason: z.string().min(1)
    }).strict()),
    tone: uniqueStringsSchema,
    estimatedDurationSeconds: z.number().int().nonnegative(),
    culturalSources: z.array(z.object({
      id: identifierSchema,
      title: z.string().min(1),
      region: z.string().min(1),
      reference: z.string().min(1),
      note: z.string()
    }).strict()),
    status: z.enum(["draft", "review", "ready", "archived"])
  }).strict(),
  data: z.object({ acts: z.array(dreamActSchema).min(5).max(7) }).strict()
}).strict();

export const assetEntrySchema = z.object({
  assetId: identifierSchema,
  type: z.string().min(1),
  file: z.string().min(1).refine((file) => !file.startsWith("/") && !file.split("/").includes(".."), "素材路径必须是安全的相对路径"),
  status: z.string().optional()
}).passthrough();

export const assetManifestSchema = z.object({
  schemaVersion: z.literal("0.1.0"),
  assets: z.array(assetEntrySchema)
}).passthrough();

export type DreamCard = z.infer<typeof dreamCardSchema>;
export type DreamAct = z.infer<typeof dreamActSchema>;
export type DreamText = z.infer<typeof dreamTextSchema>;
export type DreamCharacter = DreamAct["characters"][number];
export type AssetManifest = z.infer<typeof assetManifestSchema>;
export type AssetEntry = z.infer<typeof assetEntrySchema>;
