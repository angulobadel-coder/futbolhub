import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export { supabase };

export type Tables = Database["public"]["Tables"];
export type School = Tables["schools"]["Row"];
export type Category = Tables["categories"]["Row"];
export type Coach = Tables["coaches"]["Row"];
export type Team = Tables["teams"]["Row"];
export type Player = Tables["players"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type PlayerStatus = Database["public"]["Enums"]["player_status"];

/** Normaliza errores de la capa de datos para la UI. */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}
