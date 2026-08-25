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

type Insert<T> = Omit<T, "id" | "created_at">;

export async function upsertPlayer(schoolId: string, values: Partial<Player> & { id?: string }) {
  const payload = { ...values, school_id: schoolId };
  if (values.id) {
    return unwrap(await supabase.from("players").update(payload).eq("id", values.id).select().single());
  }
  return unwrap(await supabase.from("players").insert(payload as Insert<Player>).select().single());
}

export async function upsertCoach(schoolId: string, values: Partial<Coach> & { id?: string }) {
  const payload = { ...values, school_id: schoolId };
  if (values.id) {
    return unwrap(await supabase.from("coaches").update(payload).eq("id", values.id).select().single());
  }
  return unwrap(await supabase.from("coaches").insert(payload as Insert<Coach>).select().single());
}

export async function upsertCategory(schoolId: string, values: Partial<Category> & { id?: string }) {
  const payload = { ...values, school_id: schoolId };
  if (values.id) {
    return unwrap(await supabase.from("categories").update(payload).eq("id", values.id).select().single());
  }
  return unwrap(await supabase.from("categories").insert(payload as Insert<Category>).select().single());
}

export async function upsertTeam(schoolId: string, values: Partial<Team> & { id?: string }) {
  const payload = { ...values, school_id: schoolId };
  if (values.id) {
    return unwrap(await supabase.from("teams").update(payload).eq("id", values.id).select().single());
  }
  return unwrap(await supabase.from("teams").insert(payload as Insert<Team>).select().single());
}

export async function removeRow(
  table: "players" | "coaches" | "categories" | "teams",
  id: string,
) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
