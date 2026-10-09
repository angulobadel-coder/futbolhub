import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/**
 * Envío de mensajes de WhatsApp mediante Meta Cloud API (Graph API).
 *
 * Seguridad:
 * - Requiere sesión autenticada (requireSupabaseAuth).
 * - Solo usuarios con rol superadmin, director o entrenador pueden enviar.
 * - Las credenciales (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, …) se leen
 *   con process.env dentro del handler: jamás llegan al bundle del navegador.
 */

const AUTHORIZED_ROLES = new Set(["superadmin", "director", "coach"]);

const testInput = z.object({
  phone: z
    .string()
    .trim()
    .regex(
      /^\d{8,15}$/,
      "Ingresa el número con código de país, solo dígitos (ej. 573001234567).",
    ),
});

async function assertCanSendWhatsApp(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error("No pudimos verificar tu rol. Inténtalo de nuevo.");
  const allowed = (roles ?? []).some((r) => AUTHORIZED_ROLES.has(r.role));
  if (!allowed) {
    throw new Error(
      "Solo los administradores y entrenadores pueden enviar mensajes de WhatsApp.",
    );
  }
}

function whatsappCredentials() {
  const token = process.env["WHATSAPP_TOKEN"];
  const phoneNumberId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp aún no está conectado: faltan las credenciales WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID en la configuración del servidor.",
    );
  }
  return { token, phoneNumberId };
}

/** Envía la plantilla de prueba `hello_world` de Meta a un número dado. */
export const sendWhatsAppTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => testInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertCanSendWhatsApp(context.supabase, context.userId);
    const { token, phoneNumberId } = whatsappCredentials();

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: data.phone,
          type: "template",
          template: { name: "hello_world", language: { code: "en_US" } },
        }),
      },
    );

    const json: unknown = await res.json().catch(() => null);
    const payload =
      json && typeof json === "object" ? (json as Record<string, unknown>) : {};

    if (!res.ok) {
      const metaError = payload["error"] as { message?: string } | undefined;
      console.error("[WhatsApp] Meta respondió con error", res.status, metaError);
      throw new Error(
        `Meta rechazó el envío: ${metaError?.message ?? `error ${res.status}`}`,
      );
    }

    const messages = payload["messages"] as { id?: string }[] | undefined;
    return {
      ok: true as const,
      messageId: messages?.[0]?.id ?? null,
      to: data.phone,
    };
  });

/** Indica si las credenciales de WhatsApp están configuradas en el servidor. */
export const whatsappStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCanSendWhatsApp(context.supabase, context.userId);
    const configured = Boolean(
      process.env["WHATSAPP_TOKEN"] && process.env["WHATSAPP_PHONE_NUMBER_ID"],
    );
    return { configured };
  });
