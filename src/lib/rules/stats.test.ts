import { describe, expect, it } from "vitest";
import { sessionMinutes, weekStart, weeklyAttendance } from "./stats";

const s = (id: string, date: string, status = "realizado") =>
  ({ id, session_date: date, status, start_time: "16:00:00", end_time: "17:30:00" }) as never;
const a = (session_id: string, status: string) => ({ session_id, status, player_id: "p" }) as never;

describe("estadísticas", () => {
  it("la semana empieza el lunes", () => {
    expect(weekStart("2026-11-08")).toBe("2026-11-02");
    expect(weekStart("2026-11-02")).toBe("2026-11-02");
  });
  it("calcula minutos de la sesión", () => {
    expect(sessionMinutes({ start_time: "16:00:00", end_time: "17:30:00" })).toBe(90);
    expect(sessionMinutes({ start_time: "16:00:00", end_time: null })).toBe(0);
  });
  it("cuenta presentes por semana e ignora sesiones canceladas", () => {
    const pts = weeklyAttendance(
      [a("1", "presente"), a("1", "ausente"), a("2", "presente")],
      [s("1", "2026-11-03"), s("2", "2026-11-04", "cancelado")],
    );
    expect(pts).toEqual([{ week: "2026-11-02", presentes: 1, registros: 2, porcentaje: 50 }]);
  });
});
