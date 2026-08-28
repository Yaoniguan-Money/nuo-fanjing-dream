import { describe, expect, it } from "vitest";
import { createDreamSession, dreamSessionSchema } from "./schema";

describe("DreamSession v1", () => {
  it("creates a versioned matched session", () => {
    const session = createDreamSession("我想找到一条路", { schemaVersion: "1.0.0", cardId: "dream.kailu-jiangjun.du-shan-ji", provider: "deterministic-local", confidence: .8, reason: "fixture" }, new Date("2026-08-28T00:00:00.000Z"));
    expect(dreamSessionSchema.parse(session).status).toBe("matched");
    expect(session.schemaVersion).toBe("1.0.0");
  });
});
