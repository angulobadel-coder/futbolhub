import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "attendance_summary",
  title: "Resumen de asistencia",
  description:
    "Calcula el porcentaje de asistencia de un jugador (o de todos los jugadores visibles) y marca a quienes están por debajo del 70%.",
  inputSchema: {
    player_id: z.string().uuid().optional().describe("Id del jugador; si se omite, incluye todos."),
    school_id: z.string().uuid().optional().describe("Id de la escuela para acotar el cálculo."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ player_id, school_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    let attendance = supabase.from("attendance").select("player_id, status");
    if (player_id) attendance = attendance.eq("player_id", player_id);
    if (school_id) attendance = attendance.eq("school_id", school_id);

    let players = supabase.from("players").select("id, full_name, school_id");
    if (player_id) players = players.eq("id", player_id);
    if (school_id) players = players.eq("school_id", school_id);

    const [attRes, playersRes] = await Promise.all([attendance, players]);
    if (attRes.error) return errorResult(attRes.error.message);
    if (playersRes.error) return errorResult(playersRes.error.message);

    const names = new Map((playersRes.data ?? []).map((p) => [p.id, p.full_name]));
    const tally = new Map<string, { total: number; present: number }>();
    for (const row of attRes.data ?? []) {
      const entry = tally.get(row.player_id) ?? { total: 0, present: 0 };
      entry.total += 1;
      if (row.status === "present" || row.status === "late") entry.present += 1;
      tally.set(row.player_id, entry);
    }

    const summary = [...names.entries()].map(([id, full_name]) => {
      const entry = tally.get(id) ?? { total: 0, present: 0 };
      const rate = entry.total === 0 ? null : Math.round((entry.present / entry.total) * 100);
      return {
        player_id: id,
        full_name,
        sessions: entry.total,
        attended: entry.present,
        attendance_rate: rate,
        below_threshold: rate !== null && rate < 70,
      };
    });

    return jsonResult(summary.sort((a, b) => (a.attendance_rate ?? 101) - (b.attendance_rate ?? 101)));
  },
});
