import { supabase, unwrap } from "./client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Exercise = T["training_exercises"]["Row"];
export type Drill = T["training_session_drills"]["Row"];
export type Feedback = T["training_session_feedback"]["Row"];

export const EXERCISE_KINDS: Record<string, string> = {
  tecnica: "Técnica",
  tactica: "Táctica",
  fisica: "Física",
  balon_parado: "Balón parado",
};
export const INTENSITIES: Record<string, string> = { baja: "Baja", media: "Media", alta: "Alta" };

export async function listExercises(schoolId: string): Promise<Exercise[]> {
  return (
    unwrap(
      await supabase.from("training_exercises").select("*").eq("school_id", schoolId).order("name"),
    ) ?? []
  );
}

export async function saveExercise(
  schoolId: string,
  values: Partial<Exercise> & { name: string },
) {
  const { id, ...rest } = values;
  const payload = { ...rest, school_id: schoolId };
  const q = id
    ? supabase.from("training_exercises").update(payload).eq("id", id)
    : supabase.from("training_exercises").insert(payload);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export async function removeExercise(id: string) {
  const { error } = await supabase.from("training_exercises").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listDrills(sessionId: string): Promise<Drill[]> {
  return (
    unwrap(
      await supabase
        .from("training_session_drills")
        .select("*")
        .eq("session_id", sessionId)
        .order("position"),
    ) ?? []
  );
}

export async function addDrill(values: Omit<T["training_session_drills"]["Insert"], "id">) {
  const { error } = await supabase.from("training_session_drills").insert(values);
  if (error) throw new Error(error.message);
}

export async function updateDrill(id: string, values: T["training_session_drills"]["Update"]) {
  const { error } = await supabase.from("training_session_drills").update(values).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeDrill(id: string) {
  const { error } = await supabase.from("training_session_drills").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getFeedback(sessionId: string): Promise<Feedback | null> {
  const { data, error } = await supabase
    .from("training_session_feedback")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveFeedback(values: T["training_session_feedback"]["Insert"]) {
  const { error } = await supabase
    .from("training_session_feedback")
    .upsert({ ...values, updated_at: new Date().toISOString() }, { onConflict: "session_id" });
  if (error) throw new Error(error.message);
}
