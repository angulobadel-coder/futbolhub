import type { Attendance, TrainingSession } from "@/lib/api/training";

/** Lunes (YYYY-MM-DD) de la semana de una fecha. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/** Minutos de una sesión; sin hora de fin se asume 0. */
export function sessionMinutes(s: Pick<TrainingSession, "start_time" | "end_time">): number {
  if (!s.end_time) return 0;
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  return Math.max(0, toMin(s.end_time) - toMin(s.start_time));
}

export interface WeekPoint {
  week: string;
  presentes: number;
  registros: number;
  porcentaje: number;
}

/** Presentes por semana (la métrica principal) sobre sesiones no canceladas. */
export function weeklyAttendance(attendance: Attendance[], sessions: TrainingSession[]): WeekPoint[] {
  const byId = new Map(sessions.filter((s) => s.status !== "cancelado").map((s) => [s.id, s]));
  const map = new Map<string, WeekPoint>();
  for (const a of attendance) {
    const s = byId.get(a.session_id);
    if (!s) continue;
    const week = weekStart(s.session_date);
    const p = map.get(week) ?? { week, presentes: 0, registros: 0, porcentaje: 0 };
    p.registros += 1;
    if (a.status === "presente") p.presentes += 1;
    map.set(week, p);
  }
  const out = [...map.values()].sort((a, b) => a.week.localeCompare(b.week));
  for (const p of out) p.porcentaje = p.registros ? Math.round((p.presentes / p.registros) * 100) : 0;
  return out;
}

/** Porcentaje de asistencia agrupado por una clave de la sesión (equipo o categoría). */
export function attendanceBy(
  attendance: Attendance[],
  sessions: TrainingSession[],
  key: (s: TrainingSession) => string | null,
): Map<string, { presentes: number; registros: number; porcentaje: number }> {
  const byId = new Map(sessions.filter((s) => s.status !== "cancelado").map((s) => [s.id, s]));
  const map = new Map<string, { presentes: number; registros: number; porcentaje: number }>();
  for (const a of attendance) {
    const s = byId.get(a.session_id);
    const k = s ? key(s) : null;
    if (!k) continue;
    const v = map.get(k) ?? { presentes: 0, registros: 0, porcentaje: 0 };
    v.registros += 1;
    if (a.status === "presente") v.presentes += 1;
    map.set(k, v);
  }
  for (const v of map.values()) v.porcentaje = v.registros ? Math.round((v.presentes / v.registros) * 100) : 0;
  return map;
}
