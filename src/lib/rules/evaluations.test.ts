import { describe, expect, it } from "vitest";
import { evaluationAverage, isValidScore, suggestedPeriods } from "./evaluations";

describe("evaluaciones", () => {
  it("promedia los 4 pilares sobre 5 con un decimal", () => {
    expect(evaluationAverage({ technique: 4, tactics: 4, physical: 5, attitude: 4 })).toBe(4.3);
  });
  it("solo acepta estrellas de 1 a 5", () => {
    expect(isValidScore(0)).toBe(false);
    expect(isValidScore(6)).toBe(false);
    expect(isValidScore(3)).toBe(true);
  });
  it("sugiere mes y trimestre de la fecha", () => {
    const p = suggestedPeriods(new Date(2026, 10, 15));
    expect(p).toContain("Noviembre 2026");
    expect(p).toContain("IV Trimestre 2026");
  });
});
