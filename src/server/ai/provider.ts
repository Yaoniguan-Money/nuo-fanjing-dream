import type { DreamCard } from "@/domain/dream-card";
import type { MatchRequest, MatchResponse } from "@/domain/dream-session";
import type { InterpretRequest, InterpretResponse } from "@/domain/interpretation";

export interface DreamAiProvider {
  readonly id: "deterministic-local";
  match(request: MatchRequest, cards: DreamCard[]): Promise<MatchResponse>;
  interpret(request: InterpretRequest, authoritativeCard: DreamCard): Promise<InterpretResponse>;
}
