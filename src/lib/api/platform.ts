import { supabase, unwrap, type School } from "./client";

export interface SchoolSummary {
  school: School;
  players: number;
  coaches: number;
  teams: number;
  categories: number;
  users: number;
}

export interface PlatformOverview {
  summaries: SchoolSummary[];
  totals: {
    schools: number;
    activeSchools: number;
    players: number;
    coaches: number;
    teams: number;
    users: number;
  };
}

/** Indicadores globales de la plataforma (solo superadministrador). */
export async function fetchPlatformOverview(): Promise<PlatformOverview> {
  const [schools, players, coaches, teams, categories, roles] = await Promise.all([
    supabase.from("schools").select("*").order("name"),
    supabase.from("players").select("id, school_id, status"),
    supabase.from("coaches").select("id, school_id"),
    supabase.from("teams").select("id, school_id"),
    supabase.from("categories").select("id, school_id"),
    supabase.from("user_roles").select("user_id, school_id"),
  ]);

  const schoolRows = unwrap(schools) ?? [];
  const playerRows = unwrap(players) ?? [];
  const coachRows = unwrap(coaches) ?? [];
  const teamRows = unwrap(teams) ?? [];
  const categoryRows = unwrap(categories) ?? [];
  const roleRows = roles.error ? [] : (roles.data ?? []);

  const count = (rows: { school_id: string | null }[], id: string) =>
    rows.filter((r) => r.school_id === id).length;

  const summaries = schoolRows.map((school) => ({
    school,
    players: count(playerRows, school.id),
    coaches: count(coachRows, school.id),
    teams: count(teamRows, school.id),
    categories: count(categoryRows, school.id),
    users: new Set(
      roleRows.filter((r) => r.school_id === school.id).map((r) => r.user_id),
    ).size,
  }));

  return {
    summaries,
    totals: {
      schools: schoolRows.length,
      activeSchools: schoolRows.filter((s) => s.is_active).length,
      players: playerRows.length,
      coaches: coachRows.length,
      teams: teamRows.length,
      users: new Set(roleRows.map((r) => r.user_id)).size,
    },
  };
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function upsertSchool(values: {
  id?: string;
  name: string;
  city?: string | null;
  is_active?: boolean;
}) {
  const payload = {
    name: values.name,
    city: values.city ?? null,
    is_active: values.is_active ?? true,
    slug: slugify(values.name),
  };
  const query = values.id
    ? supabase.from("schools").update(payload).eq("id", values.id)
    : supabase.from("schools").insert(payload);
  return unwrap(await query.select().single());
}

export async function setSchoolActive(id: string, isActive: boolean) {
  const { error } = await supabase.from("schools").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error(error.message);
}
