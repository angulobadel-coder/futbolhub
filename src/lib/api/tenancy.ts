import { supabase, unwrap, type AppRole, type School } from "./client";

export interface Membership {
  role: AppRole;
  school: School;
}

/** Devuelve las escuelas a las que pertenece el usuario autenticado. */
export async function fetchMemberships(): Promise<Membership[]> {
  const rows = unwrap(
    await supabase
      .from("user_roles")
      .select("role, schools:school_id(*)")
      .not("school_id", "is", null),
  );

  return (rows ?? [])
    .filter((row) => row.schools)
    .map((row) => ({ role: row.role as AppRole, school: row.schools as unknown as School }));
}

export async function fetchProfile(userId: string) {
  return unwrap(
    await supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
  );
}

export const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Superadministrador",
  director: "Director de escuela",
  coach: "Entrenador",
  guardian: "Acudiente",
  player: "Jugador",
};

/** Permisos de escritura por módulo, según el rol dentro de la escuela. */
export function canManage(role: AppRole | undefined) {
  return role === "director" || role === "superadmin";
}
