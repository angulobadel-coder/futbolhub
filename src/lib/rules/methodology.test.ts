import { describe, expect, it } from "vitest";
import { materialsList, phaseTotals, sessionMinutes } from "./methodology";

describe("metodología", () => {
  it("suma minutos por fase y total", () => {
    const r = phaseTotals([
      { phase: "calentamiento", duration_min: 15, materials: null },
      { phase: "principal", duration_min: 20, materials: null },
      { phase: "principal", duration_min: 25, materials: null },
      { phase: "vuelta_calma", duration_min: 10, materials: null },
    ]);
    expect(r.byPhase.principal).toBe(45);
    expect(r.total).toBe(70);
  });
  it("calcula la duración programada", () => {
    expect(sessionMinutes("16:00", "17:30")).toBe(90);
    expect(sessionMinutes("16:00", null)).toBeNull();
  });
  it("consolida materiales sin duplicados", () => {
    expect(
      materialsList([
        { phase: "principal", duration_min: 1, materials: "10 conos, balones" },
        { phase: "principal", duration_min: 1, materials: "Balones\npetos" },
      ]),
    ).toEqual(["10 conos", "Balones", "petos"]);
  });
});
