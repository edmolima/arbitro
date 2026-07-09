import { describe, it, expect } from "vitest";
import { EVAL_PACKAGE } from "../src/index";

describe("scaffold", () => {
  it("exports the package marker", () => {
    expect(EVAL_PACKAGE).toBe("@arbitro/eval");
  });
});
