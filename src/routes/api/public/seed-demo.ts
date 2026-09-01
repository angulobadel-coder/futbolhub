import { createFileRoute } from "@tanstack/react-router";

const DEMO_PASSWORD = "FutbolDemo2026!";
const SCHOOL_SLUG = "academia-futbol-futuro";
const DEMO_COACH_ID = "33333333-0000-0000-0000-000000000002";
const DEMO_PLAYER_ID = "be2a5c42-5822-4015-bba4-5826e2ad2f08";
const DEMO_PLAYER_2_ID = "3f8e7030-5cf6-48dd-a33d-b4c46fa65a9a";

const ACCOUNTS = [
  { email: "superadmin@futbolgestion.demo", name: "Propietario FútbolGestión", role: "superadmin" },
  { email: "director@futbolgestion.demo", name: "Directora Demo Ruiz", role: "director" },
  { email: "entrenador@futbolgestion.demo", name: "Marta Demo Ospina", role: "coach" },
  { email: "acudiente@futbolgestion.demo", name: "Carolina Demo Gómez", role: "guardian" },
  { email: "jugador@futbolgestion.demo", name: "Mateo Demo Gómez", role: "player" },
] as const;

export const Route = createFileRoute("/api/public/seed-demo")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: school } = await supabaseAdmin
          .from("schools")
          .select("id")
          .eq("slug", SCHOOL_SLUG)
          .single();
        if (!school) return new Response("demo school missing", { status: 500 });

        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = new Map((list?.users ?? []).map((u) => [u.email ?? "", u.id]));
        const ids: Record<string, string> = {};

        for (const account of ACCOUNTS) {
          let id = existing.get(account.email);
          if (!id) {
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
              email: account.email,
              password: DEMO_PASSWORD,
              email_confirm: true,
              user_metadata: { full_name: account.name, skip_default_role: "true" },
            });
            if (error) return new Response(`create ${account.email}: ${error.message}`, { status: 500 });
            id = data.user!.id;
          }
          ids[account.role] = id;
          await supabaseAdmin.from("profiles").upsert(
            { id, full_name: account.name, email: account.email },
            { onConflict: "id" },
          );
          await supabaseAdmin.from("user_roles").upsert(
            {
              user_id: id,
              role: account.role as never,
              school_id: account.role === "superadmin" ? null : school.id,
            },
            { onConflict: "user_id,role", ignoreDuplicates: true },
          );
        }

        await supabaseAdmin.from("coaches").update({ user_id: ids["coach"]! }).eq("id", DEMO_COACH_ID);
        await supabaseAdmin.from("players").update({ user_id: ids["player"]! }).eq("id", DEMO_PLAYER_ID);
        for (const playerId of [DEMO_PLAYER_ID, DEMO_PLAYER_2_ID]) {
          await supabaseAdmin.from("player_guardians").upsert(
            {
              school_id: school.id,
              player_id: playerId,
              user_id: ids["guardian"]!,
              relationship: "Madre",
            },
            { onConflict: "player_id,user_id", ignoreDuplicates: true },
          );
        }

        return Response.json({ ok: true, accounts: ACCOUNTS.map((a) => a.email) });
      },
    },
  },
});
