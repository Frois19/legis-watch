import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("mescla classes e resolve conflitos do tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-medium")).toBe(
      "text-sm font-medium",
    );
  });
});
