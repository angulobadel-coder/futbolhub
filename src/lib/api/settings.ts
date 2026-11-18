import { useQuery } from "@tanstack/react-query";
import { supabase } from "./client";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_SETTINGS } from "@/lib/rules/settings";

type T = Database["public"]["Tables"]["school_settings"];
export type SchoolSettings = T["Row"];

export async function getSchoolSettings(schoolId: string): Promise<SchoolSettings> {
  const { data, error } = await supabase
    .from("school_settings")
    .select("*")
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? { ...DEFAULT_SETTINGS, school_id: schoolId, updated_at: new Date().toISOString() };
}

export async function saveSchoolSettings(schoolId: string, values: Omit<T["Insert"], "school_id">) {
  const { error } = await supabase
    .from("school_settings")
    .upsert({ ...values, school_id: schoolId, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function saveSchoolIdentity(schoolId: string, name: string, city: string, logoUrl: string) {
  const { error } = await supabase.rpc("update_school_identity", {
    _school_id: schoolId,
    _name: name,
    _city: city,
    _logo_url: logoUrl,
  });
  if (error) throw new Error(error.message);
}

/** Configuración de la escuela activa (con valores por defecto si aún no se ha guardado). */
export function useSchoolSettings(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["school-settings", schoolId],
    enabled: !!schoolId,
    queryFn: () => getSchoolSettings(schoolId!),
  });
}
