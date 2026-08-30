import type { Category, Coach, Player, Team } from "@/lib/api/client";
import type { Attendance, TrainingSession } from "@/lib/api/training";
import {
  computeAttendance,
  LOW_ATTENDANCE_THRESHOLD,
  lowAttendancePlayers,
} from "@/lib/rules/attendance";

export type AlertLevel = "info" | "warning" | "critical";

export interface SchoolAlert {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  recommendation: string;
}

export interface SchoolSnapshot {
  players: Player[];
  coaches: Coach[];
  categories: Category[];
  teams: Team[];
  sessions?: TrainingSession[];
  attendance?: Attendance[];
}

type Rule = (snapshot: SchoolSnapshot) => SchoolAlert[];

/**
 * Reglas explicables sobre datos existentes. Cada regla es independiente para
 * poder ampliarlas (asistencia, pagos, rendimiento) sin tocar el resto.
 */
const rules: Rule[] = [
  ({ players }) => {
    const suspended = players.filter((p) => p.status === "suspendido");
    if (suspended.length === 0) return [];
    return [
      {
        id: "jugadores-suspendidos",
        level: "critical",
        title: `${suspended.length} jugador(es) suspendido(s)`,
        detail: suspended.map((p) => p.full_name).join(", "),
        recommendation: "Revisar el motivo de la suspensión y definir un plan de retorno.",
      },
    ];
  },
  ({ players }) => {
    const inactive = players.filter((p) => p.status === "inactivo");
    if (inactive.length === 0) return [];
    return [
      {
        id: "jugadores-inactivos",
        level: "warning",
        title: `${inactive.length} jugador(es) inactivo(s)`,
        detail: inactive.map((p) => p.full_name).join(", "),
        recommendation: "Contactar al acudiente para confirmar continuidad en el proceso.",
      },
    ];
  },
  ({ players }) => {
    const unassigned = players.filter((p) => !p.team_id && p.status === "activo");
    if (unassigned.length === 0) return [];
    return [
      {
        id: "jugadores-sin-equipo",
        level: "warning",
        title: `${unassigned.length} jugador(es) activo(s) sin equipo`,
        detail: unassigned.map((p) => p.full_name).join(", "),
        recommendation: "Asignar equipo para que puedan participar en entrenamientos y partidos.",
      },
    ];
  },
  ({ teams }) => {
    const orphan = teams.filter((t) => !t.coach_id);
    if (orphan.length === 0) return [];
    return [
      {
        id: "equipos-sin-entrenador",
        level: "warning",
        title: `${orphan.length} equipo(s) sin entrenador asignado`,
        detail: orphan.map((t) => t.name).join(", "),
        recommendation: "Asignar un entrenador responsable a cada equipo.",
      },
    ];
  },
  ({ categories, players }) => {
    const empty = categories.filter((c) => !players.some((p) => p.category_id === c.id));
    if (empty.length === 0) return [];
    return [
      {
        id: "categorias-vacias",
        level: "info",
        title: `${empty.length} categoría(s) sin jugadores`,
        detail: empty.map((c) => c.name).join(", "),
        recommendation: "Evaluar convocatoria o desactivar temporalmente la categoría.",
      },
    ];
  },
  ({ players, sessions, attendance }) => {
    // Sin datos suficientes no se genera ninguna alerta.
    if (!sessions?.length || !attendance?.length) return [];
    const stats = computeAttendance(attendance, sessions);
    const low = lowAttendancePlayers(stats, players);
    if (low.length === 0) return [];
    return low.map(({ player, stat }) => ({
      id: `asistencia-baja-${player.id}`,
      level: "warning" as const,
      title: `${player.full_name}: asistencia del ${stat.percentage}%`,
      detail: `${stat.present} de ${stat.registered} entrenamientos con asistencia registrada.`,
      recommendation: `Se detectó una asistencia inferior al ${LOW_ATTENDANCE_THRESHOLD}%. Se recomienda realizar seguimiento.`,
    }));
  },
];

export function evaluateAlerts(snapshot: SchoolSnapshot): SchoolAlert[] {
  const order: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2 };
  return rules
    .flatMap((rule) => rule(snapshot))
    .sort((a, b) => order[a.level] - order[b.level]);
}
