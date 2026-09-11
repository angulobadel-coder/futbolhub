import type { Database } from "@/integrations/supabase/types";

import { supabase, unwrap, type AppRole } from "./client";

export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];

/** Código de activación aleatorio, legible y difícil de adivinar. */
export function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

export async function listInvitations(schoolId?: string): Promise<Invitation[]> {
  let query = supabase.from("invitations").select("*").order("created_at", { ascending: false });
  if (schoolId) query = query.eq("school_id", schoolId);
  return unwrap(await query) ?? [];
}

export async function createInvitation(values: {
  schoolId: string;
  role: AppRole;
  email: string;
  fullName?: string | null;
  playerId?: string | null;
}) {
  const code = generateCode();
  const { data: auth } = await supabase.auth.getUser();
  const row = unwrap(
    await supabase
      .from("invitations")
      .insert({
        school_id: values.schoolId,
        role: values.role,
        email: values.email.trim().toLowerCase(),
        full_name: values.fullName ?? null,
        player_id: values.playerId ?? null,
        code,
        invited_by: auth.user?.id ?? null,
      })
      .select()
      .single(),
  );
  return row;
}

export async function revokeInvitation(id: string) {
  const { error } = await supabase
    .from("invitations")
    .update({ status: "revocada" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export function invitationLink(code: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/activar?code=${code}`;
}
