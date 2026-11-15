import { supabase, unwrap } from "./client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"]["player_evaluations"];
export type Evaluation = T["Row"];

export async function listEvaluations(schoolId: string): Promise<Evaluation[]> {
  return (
    unwrap(
      await supabase
        .from("player_evaluations")
        .select("*")
        .eq("school_id", schoolId)
        .order("evaluated_on", { ascending: false }),
    ) ?? []
  );
}

export async function saveEvaluation(values: T["Insert"]) {
  const { id, ...rest } = values;
  const q = id
    ? supabase.from("player_evaluations").update(rest).eq("id", id)
    : supabase.from("player_evaluations").insert(rest);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export async function removeEvaluation(id: string) {
  const { error } = await supabase.from("player_evaluations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
