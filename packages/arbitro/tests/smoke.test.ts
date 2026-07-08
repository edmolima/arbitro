import { describe, it, expect } from "vitest";
import { ARBITRO_VERSION } from "../src/index";

describe("scaffold", () => {
  it("exports a version string", () => {
    expect(ARBITRO_VERSION).toBe("0.1.0");
  });
});
