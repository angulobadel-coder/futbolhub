import { supabase, unwrap, type Category, type Coach, type Player, type Team } from "./client";

/* ---------------------------------- reads --------------------------------- */

export async function listCategories(schoolId: string): Promise<Category[]> {
  return unwrap(
    await supabase.from("categories").select("*").eq("school_id", schoolId).order("name"),
  ) ?? [];
}

export async function listCoaches(schoolId: string): Promise<Coach[]> {
  return unwrap(
    await supabase.from("coaches").select("*").eq("school_id", schoolId).order("full_name"),
  ) ?? [];
}

export async function listTeams(schoolId: string): Promise<Team[]> {
  return unwrap(
    await supabase.from("teams").select("*").eq("school_id", schoolId).order("name"),
  ) ?? [];
}

export async function listPlayers(schoolId: string): Promise<Player[]> {
  return unwrap(
    await supabase.from("players").select("*").eq("school_id", schoolId).order("full_name"),
  ) ?? [];
}

/* --------------------------------- writes --------------------------------- */

/** Valores parciales aceptados por los formularios (permite undefined y null). */
export type Draft<T> = { [K in keyof T]?: T[K] | undefined } & { id?: string | undefined };

/** Elimina claves con `undefined` para no chocar con los tipos generados. */
function clean(values: Record<string, unknown>, schoolId: string) {
  const out: Record<string, unknown> = { school_id: schoolId };
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && key !== "id") out[key] = value;
  }
  return out;
}

type Table = "players" | "coaches" | "categories" | "teams";

async function upsertRow(table: Table, schoolId: string, values: Record<string, unknown>) {
  const payload = clean(values, schoolId);
  const id = values["id"] as string | undefined;
  const query = id
    ? supabase.from(table).update(payload as never).eq("id", id)
    : supabase.from(table).insert(payload as never);
  return unwrap(await query.select().single());
}

export function upsertPlayer(schoolId: string, values: Draft<Player>) {
  return upsertRow("players", schoolId, values);
}

export function upsertCoach(schoolId: string, values: Draft<Coach>) {
  return upsertRow("coaches", schoolId, values);
}

export function upsertCategory(schoolId: string, values: Draft<Category>) {
  return upsertRow("categories", schoolId, values);
}

export function upsertTeam(schoolId: string, values: Draft<Team>) {
  return upsertRow("teams", schoolId, values);
}

export async function removeRow(
  table: "players" | "coaches" | "categories" | "teams",
  id: string,
) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
