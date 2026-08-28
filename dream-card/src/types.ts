export type CharacterPosition = "left" | "center" | "right";
export type DisplayMode = "typewriter" | "instant";
export type AdvanceMode = "manual" | "auto";
export type TextKind = "narration" | "dialogue" | "action" | "final-narration";

export interface DreamText {
  id: string;
  content: string;
  speakerId: string;
  display: {
    mode: DisplayMode;
    advance: AdvanceMode;
  };
  extensions?: {
    sourceType?: TextKind | string;
    speakerName?: string;
    self?: boolean;
    mystic?: boolean;
    [key: string]: unknown;
  };
}

export interface DreamCharacter {
  instanceId: string;
  assetId: string;
  position: CharacterPosition;
}

export interface DreamAct {
  id: string;
  title: string;
  backgroundAssetId: string;
  characters: DreamCharacter[];
  texts: DreamText[];
  choices: unknown[];
  notes: string;
}

export interface DreamCard {
  $schema: string;
  schemaVersion: string;
  meta: {
    id: string;
    version: string;
    title: string;
    synopsis: string;
    match: {
      tags: string[];
      situations: string[];
      emotions: string[];
      dilemmas: string[];
      relationships: string[];
      excludeTags: string[];
    };
    officeCandidates: Array<{ officeId: string; fit: number; reason: string }>;
    tone: string[];
    estimatedDurationSeconds: number;
    culturalSources: Array<Record<string, string>>;
    status: "draft" | "review" | "ready" | "archived";
  };
  data: {
    acts: DreamAct[];
  };
}

export interface AssetEntry {
  assetId: string;
  type: "background" | "character" | "audio" | string;
  file: string;
  status?: "placeholder" | "draft" | "ready" | string;
  description?: string;
  [key: string]: unknown;
}

export interface AssetManifest {
  schemaVersion: string;
  assets: AssetEntry[];
}

export interface CardOption {
  modulePath: string;
  card: DreamCard;
}

export interface PlayerIssue {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
}
