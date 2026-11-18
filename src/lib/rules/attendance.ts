import type { Player } from "@/lib/api/client";
import type { Attendance, TrainingSession } from "@/lib/api/training";

export interface PlayerAttendance {
  playerId: string;
  registered: number;
  present: number;
  justified: number;
  absent: number;
  /** Porcentaje = presentes / registros × 100. */
  percentage: number;
}

/**
 * Calcula la asistencia por jugador sobre los entrenamientos realizados.
 * Las ausencias justificadas se contabilizan aparte para poder cambiar el
 * criterio más adelante sin rehacer el cálculo.
 */
export function computeAttendance(
  attendance: Attendance[],
  sessions: TrainingSession[],
): Map<string, PlayerAttendance> {
  const validSessions = new Set(
    sessions.filter((s) => s.status !== "cancelado").map((s) => s.id),
  );
  const map = new Map<string, PlayerAttendance>();

  for (const row of attendance) {
    if (!validSessions.has(row.session_id)) continue;
    const current =
      map.get(row.player_id) ??
      { playerId: row.player_id, registered: 0, present: 0, justified: 0, absent: 0, percentage: 0 };
    current.registered += 1;
    if (row.status === "presente") current.present += 1;
    else if (row.status === "justificado") current.justified += 1;
    else current.absent += 1;
    map.set(row.player_id, current);
  }

  for (const item of map.values()) {
    item.percentage =
      item.registered === 0 ? 0 : Math.round((item.present / item.registered) * 100);
  }
  return map;
}

export const LOW_ATTENDANCE_THRESHOLD = 70;
/** Mínimo de registros para considerar el porcentaje confiable. */
export const MIN_RECORDS_FOR_ALERT = 3;

export function averageAttendance(stats: Map<string, PlayerAttendance>) {
  const values = [...stats.values()].filter((s) => s.registered > 0);
  if (values.length === 0) return null;
  return Math.round(values.reduce((acc, s) => acc + s.percentage, 0) / values.length);
}

export function lowAttendancePlayers(
  stats: Map<string, PlayerAttendance>,
  players: Player[],
  threshold: number = LOW_ATTENDANCE_THRESHOLD,
) {
  return players
    .map((p) => ({ player: p, stat: stats.get(p.id) }))
    .filter(
      (row): row is { player: Player; stat: PlayerAttendance } =>
        !!row.stat &&
        row.stat.registered >= MIN_RECORDS_FOR_ALERT &&
        row.stat.percentage < threshold,
    );
}
