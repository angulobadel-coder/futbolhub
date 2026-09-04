import { supabase, unwrap, type AppRole, type School } from "./client";

export interface Membership {
  role: AppRole;
  school: School;
}

export interface TenancyResult {
  isSuperadmin: boolean;
  memberships: Membership[];
}

/** Prioridad cuando un usuario tiene varios roles en la misma escuela. */
const ROLE_WEIGHT: Record<AppRole, number> = {
  superadmin: 5,
  director: 4,
  coach: 3,
  guardian: 2,
  player: 1,
};

/** Roles del usuario autenticado (filtrados explícitamente por su propio id). */
async function fetchOwnRoles() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  return (
    unwrap(
      await supabase.from("user_roles").select("role, school_id").eq("user_id", auth.user.id),
    ) ?? []
  );
}

/** Devuelve las escuelas y el rol efectivo del usuario autenticado. */
export async function fetchTenancy(): Promise<TenancyResult> {
  const roles = await fetchOwnRoles();

  const isSuperadmin = roles.some((r) => r.role === "superadmin");

  if (isSuperadmin) {
    const schools = unwrap(await supabase.from("schools").select("*").order("name")) ?? [];
    return {
      isSuperadmin: true,
      memberships: schools.map((school) => ({ role: "superadmin" as AppRole, school })),
    };
  }

  const ids = [...new Set(roles.map((r) => r.school_id).filter((v): v is string => !!v))];
  if (ids.length === 0) return { isSuperadmin: false, memberships: [] };

  const schools =
    unwrap(await supabase.from("schools").select("*").in("id", ids).order("name")) ?? [];

  return {
    isSuperadmin: false,
    memberships: schools.map((school) => {
      const best = roles
        .filter((r) => r.school_id === school.id)
        .sort((a, b) => ROLE_WEIGHT[b.role as AppRole] - ROLE_WEIGHT[a.role as AppRole])[0];
      return { role: (best?.role ?? "player") as AppRole, school };
    }),
  };
}

export async function fetchProfile(userId: string) {
  return unwrap(await supabase.from("profiles").select("*").eq("id", userId).maybeSingle());
}

/** Rol principal del usuario, sin depender de una escuela seleccionada. */
export async function fetchPrimaryRole(): Promise<AppRole | null> {
  const roles = unwrap(await supabase.from("user_roles").select("role")) ?? [];
  if (roles.length === 0) return null;
  return roles
    .map((r) => r.role as AppRole)
    .sort((a, b) => ROLE_WEIGHT[b] - ROLE_WEIGHT[a])[0]!;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Superadministrador",
  director: "Administrador de escuela",
  coach: "Entrenador",
  guardian: "Padre o acudiente",
  player: "Jugador",
};

/** Permisos de escritura por módulo, según el rol dentro de la escuela. */
export function canManage(role: AppRole | undefined) {
  return role === "director" || role === "superadmin";
}
