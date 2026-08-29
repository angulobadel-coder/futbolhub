import { supabase, unwrap } from "./client";
import type { Database } from "@/integrations/supabase/types";
import type { Draft } from "./school-data";

type Tables = Database["public"]["Tables"];
export type TrainingSession = Tables["training_sessions"]["Row"];
export type Attendance = Tables["attendance"]["Row"];
export type SchoolEvent = Tables["events"]["Row"];
export type TrainingStatus = Database["public"]["Enums"]["training_status"];
export type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];

export const TRAINING_STATUS_LABEL: Record<TrainingStatus, string> = {
  programado: "Programado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  presente: "Presente",
  ausente: "Ausente",
  justificado: "Justificado",
};

/* ---------------------------------- reads --------------------------------- */

export async function listTrainingSessions(schoolId: string): Promise<TrainingSession[]> {
  return (
    unwrap(
      await supabase
        .from("training_sessions")
        .select("*")
        .eq("school_id", schoolId)
        .order("session_date", { ascending: false })
        .order("start_time", { ascending: true }),
    ) ?? []
  );
}

export async function listAttendance(schoolId: string): Promise<Attendance[]> {
  return unwrap(await supabase.from("attendance").select("*").eq("school_id", schoolId)) ?? [];
}

export async function listSessionAttendance(sessionId: string): Promise<Attendance[]> {
  return unwrap(await supabase.from("attendance").select("*").eq("session_id", sessionId)) ?? [];
}

export async function listEvents(schoolId: string): Promise<SchoolEvent[]> {
  return (
    unwrap(
      await supabase
        .from("events")
        .select("*")
        .eq("school_id", schoolId)
        .order("event_date", { ascending: true }),
    ) ?? []
  );
}

/* --------------------------------- writes --------------------------------- */

function clean(values: Record<string, unknown>, schoolId: string) {
  const out: Record<string, unknown> = { school_id: schoolId };
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && key !== "id") out[key] = value;
  }
  return out;
}

export async function upsertTrainingSession(schoolId: string, values: Draft<TrainingSession>) {
  const payload = clean(values as Record<string, unknown>, schoolId);
  const id = values.id;
  const query = id
    ? supabase.from("training_sessions").update(payload as never).eq("id", id)
    : supabase.from("training_sessions").insert(payload as never);
  return unwrap(await query.select().single()) as TrainingSession;
}

export async function removeTrainingSession(id: string) {
  const { error } = await supabase.from("training_sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Guarda la asistencia completa de una sesión sin duplicar filas. */
export async function saveAttendance(
  schoolId: string,
  sessionId: string,
  entries: { player_id: string; status: AttendanceStatus }[],
) {
  if (entries.length === 0) return;
  const rows = entries.map((e) => ({
    school_id: schoolId,
    session_id: sessionId,
    player_id: e.player_id,
    status: e.status,
    recorded_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("attendance")
    .upsert(rows as never, { onConflict: "session_id,player_id" });
  if (error) throw new Error(error.message);
}
