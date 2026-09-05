// @vitest-environment happy-dom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RitualConfirmationBoard } from "./ritual-confirmation-board";

afterEach(cleanup);

describe("ritual confirmation board", () => {
  it("uses all eight project masks in every ritual state", () => {
    render(<RitualConfirmationBoard />);

    for (const label of ["八面候坛", "匹配命中", "故事收束"]) {
      const scene = screen.getByRole("region", { name: label });
      expect(within(scene).getAllByTestId("ritual-mask")).toHaveLength(8);
    }
  });

  it("keeps the three review states in the intended sequence", () => {
    render(<RitualConfirmationBoard />);
    expect(screen.getAllByRole("region").map((scene) => scene.getAttribute("aria-label"))).toEqual([
      "八面候坛",
      "匹配命中",
      "故事收束"
    ]);
  });

  it("shows the review actions as hanging ritual plaques", () => {
    render(<RitualConfirmationBoard />);
    expect(screen.getByText("入 戏").className).toContain("ritual-board__hanging-cta");
    expect(screen.getByText("收 录 此 面").className).toContain("ritual-board__hanging-cta");
  });
});
