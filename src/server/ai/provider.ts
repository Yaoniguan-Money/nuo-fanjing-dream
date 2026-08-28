import type { DreamCard } from "@/domain/dream-card";
import type { MatchRequest, MatchResponse } from "@/domain/dream-session";
import type { InterpretRequest, InterpretResponse } from "@/domain/interpretation";

/** Provider identifiers are open to future server-side implementations. */
export type DreamAiProviderId = "deterministic-local" | (string & {});

export interface DreamAiProvider {
  readonly id: DreamAiProviderId;
  match(request: MatchRequest, cards: DreamCard[]): Promise<MatchResponse>;
  interpret(request: InterpretRequest, authoritativeCard: DreamCard): Promise<InterpretResponse>;
}
