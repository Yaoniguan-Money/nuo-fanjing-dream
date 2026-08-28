// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { listDreamCards } from "@/domain/dream-card";
import { DreamPlayer } from "./dream-player";

vi.mock("next/image", () => ({
  // The test double keeps the rendered accessibility surface without invoking Next's image runtime.
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} {...props} />
}));

afterEach(() => vi.restoreAllMocks());

describe("DreamPlayer mobile affordances", () => {
  test("keeps pointer and touch-specific advance hints available to responsive CSS", () => {
    render(<DreamPlayer card={listDreamCards()[0]} />);
    fireEvent.click(screen.getByRole("button", { name: "进 入 幻 梦" }));

    expect(screen.getByText("点击继续", { selector: ".pointer-advance-hint" })).toBeTruthy();
    expect(screen.getByText("轻触继续", { selector: ".touch-advance-hint" })).toBeTruthy();
  });
});
