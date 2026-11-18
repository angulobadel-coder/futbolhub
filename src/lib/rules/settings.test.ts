import { describe, expect, it } from "vitest";
import { clampDueDay, clampThreshold, DEFAULT_SETTINGS, parseMoney } from "./settings";

describe("configuración de escuela", () => {
  it("el umbral de asistencia por defecto es 70 % y se limita a 1–100", () => {
    expect(DEFAULT_SETTINGS.attendance_threshold).toBe(70);
    expect(clampThreshold(150)).toBe(100);
    expect(clampThreshold(0)).toBe(1);
  });
  it("el día de pago se limita a 1–28 y por defecto es 10", () => {
    expect(DEFAULT_SETTINGS.payment_due_day).toBe(10);
    expect(clampDueDay(31)).toBe(28);
    expect(clampDueDay(Number.NaN)).toBe(10);
  });
  it("los valores en pesos deben ser enteros", () => {
    expect(parseMoney("80000")).toBe(80000);
    expect(parseMoney("")).toBeNull();
    expect(() => parseMoney("12.5")).toThrow();
  });
});
