import type { AppRole, Coach, Player, Team } from "@/lib/api/client";
import type { TrainingSession } from "@/lib/api/training";

export interface ScopeInput {
  role: AppRole | undefined;
  userId: string | undefined;
  coaches: Coach[];
  teams: Team[];
  players: Player[];
}

/** Alcance de visibilidad del usuario dentro de su escuela. */
export interface Scope {
  /** true cuando el usuario ve todos los entrenamientos de la escuela. */
  seesAll: boolean;
  coachId: string | null;
  teamIds: string[];
  categoryIds: string[];
  /** Jugadores que el usuario puede consultar (para acudiente/jugador). */
  playerIds: string[] | null;
}

export function resolveScope({ role, userId, coaches, teams, players }: ScopeInput): Scope {
  if (role === "director" || role === "superadmin") {
    return { seesAll: true, coachId: null, teamIds: [], categoryIds: [], playerIds: null };
  }

  if (role === "coach") {
    const me = coaches.find((c) => c.user_id === userId) ?? null;
    const myTeams = teams.filter((t) => me && t.coach_id === me.id);
    return {
      seesAll: false,
      coachId: me?.id ?? null,
      teamIds: myTeams.map((t) => t.id),
      categoryIds: myTeams.map((t) => t.category_id).filter((v): v is string => !!v),
      playerIds: null,
    };
  }

  // Jugador o acudiente: solo su propio contexto.
  const mine = players.filter((p) => p.user_id === userId);
  return {
    seesAll: false,
    coachId: null,
    teamIds: mine.map((p) => p.team_id).filter((v): v is string => !!v),
    categoryIds: mine.map((p) => p.category_id).filter((v): v is string => !!v),
    playerIds: mine.map((p) => p.id),
  };
}

export function sessionInScope(session: TrainingSession, scope: Scope) {
  if (scope.seesAll) return true;
  if (scope.coachId && session.coach_id === scope.coachId) return true;
  if (session.team_id && scope.teamIds.includes(session.team_id)) return true;
  if (session.category_id && scope.categoryIds.includes(session.category_id)) return true;
  return false;
}

/** Puede crear/editar entrenamientos y registrar asistencia. */
export function canManageTrainings(role: AppRole | undefined) {
  return role === "director" || role === "superadmin" || role === "coach";
}
