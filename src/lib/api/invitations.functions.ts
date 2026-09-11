import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(8)
  .max(40)
  .regex(/^[A-Z0-9-]+$/, "Código inválido");

const lookupInput = z.object({ code: codeSchema });

const activateInput = z.object({
  code: codeSchema,
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(3).max(120),
});

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadministrador",
  director: "Administrador de escuela",
  coach: "Entrenador",
  guardian: "Padre o acudiente",
  player: "Jugador",
};

/** Estado de la invitación sin exponer datos sensibles de la escuela. */
export const lookupInvitation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => lookupInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("invitations")
      .select("email, role, status, expires_at, schools(name)")
      .eq("code", data.code)
      .maybeSingle();

    if (!invite) return { valid: false as const, reason: "No encontramos esa invitación." };
    if (invite.status === "aceptada")
      return { valid: false as const, reason: "Esta invitación ya fue utilizada." };
    if (invite.status === "revocada")
      return { valid: false as const, reason: "Esta invitación fue anulada." };
    if (new Date(invite.expires_at) < new Date())
      return { valid: false as const, reason: "Esta invitación ya venció." };

    return {
      valid: true as const,
      email: invite.email,
      role: invite.role,
      roleLabel: ROLE_LABEL[invite.role] ?? invite.role,
      school: (invite.schools as { name: string } | null)?.name ?? "",
    };
  });

/** Canjea la invitación: crea el acceso con la contraseña elegida por la persona. */
export const activateInvitation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => activateInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite } = await supabaseAdmin
      .from("invitations")
      .select("*")
      .eq("code", data.code)
      .maybeSingle();

    if (!invite) throw new Error("No encontramos esa invitación.");
    if (invite.status !== "pendiente") throw new Error("Esta invitación ya no está disponible.");
    if (new Date(invite.expires_at) < new Date()) throw new Error("Esta invitación ya venció.");

    const email = invite.email.trim().toLowerCase();

    let userId: string | null = null;
    let created = false;

    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });

    if (createdUser?.user) {
      userId = createdUser.user.id;
      created = true;
    } else {
      const message = createError?.message ?? "";
      if (!/already|registered|exists/i.test(message)) throw new Error(message || "No fue posible crear el acceso.");
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!existing) throw new Error("Ese correo ya tiene un acceso. Inicia sesión con tu contraseña.");
      userId = existing.id;
    }

    if (!userId) throw new Error("No fue posible crear el acceso.");

    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, school_id: invite.school_id, role: invite.role },
        { onConflict: "user_id,school_id,role", ignoreDuplicates: true },
      );

    if (invite.role === "coach") {
      const { data: coach } = await supabaseAdmin
        .from("coaches")
        .select("id")
        .eq("school_id", invite.school_id)
        .ilike("email", email)
        .maybeSingle();
      if (coach) {
        await supabaseAdmin.from("coaches").update({ user_id: userId }).eq("id", coach.id);
      } else {
        await supabaseAdmin
          .from("coaches")
          .insert({ school_id: invite.school_id, user_id: userId, full_name: data.fullName, email });
      }
    }

    if (invite.role === "player" && invite.player_id) {
      await supabaseAdmin.from("players").update({ user_id: userId }).eq("id", invite.player_id);
    }

    if (invite.role === "guardian" && invite.player_id) {
      const { data: link } = await supabaseAdmin
        .from("player_guardians")
        .select("id")
        .eq("player_id", invite.player_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!link) {
        await supabaseAdmin.from("player_guardians").insert({
          school_id: invite.school_id,
          player_id: invite.player_id,
          user_id: userId,
        });
      }
    }

    await supabaseAdmin
      .from("invitations")
      .update({
        status: "aceptada",
        accepted_at: new Date().toISOString(),
        accepted_user_id: userId,
      })
      .eq("id", invite.id);

    return { email, created };
  });
