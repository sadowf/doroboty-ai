import { describe, expect, it } from "vitest";
import { buildLabel } from "./build-info";

describe("buildLabel", () => {
  it("shows the commit and the build day", () => {
    expect(buildLabel({ commit: "1e63265", builtAt: "2026-11-11T16:25:00.000Z" })).toBe(
      "1e63265 (zbudowano 2026-11-11)",
    );
  });

  it("falls back when the commit or date is unknown", () => {
    expect(buildLabel({ commit: "", builtAt: "2026-11-11T16:25:00.000Z" })).toBe(
      "wersja lokalna bez identyfikatora",
    );
    expect(buildLabel({ commit: "1e63265", builtAt: "unknown" })).toBe("1e63265");
    expect(buildLabel(undefined)).toBe("wersja lokalna bez identyfikatora");
  });
});
