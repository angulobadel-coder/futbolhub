import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_training_sessions",
  title: "Listar entrenamientos",
  description:
    "Lista los entrenamientos visibles para el usuario autenticado, filtrables por escuela, equipo, estado y rango de fechas.",
  inputSchema: {
    school_id: z.string().uuid().optional().describe("Id de la escuela."),
    team_id: z.string().uuid().optional().describe("Id del equipo."),
    status: z
      .enum(["scheduled", "completed", "cancelled"])
      .optional()
      .describe("Estado del entrenamiento."),
    from: z.string().date().optional().describe("Fecha inicial YYYY-MM-DD."),
    to: z.string().date().optional().describe("Fecha final YYYY-MM-DD."),
    limit: z.number().int().min(1).max(200).default(50).describe("Máximo de filas."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ school_id, team_id, status, from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("training_sessions")
      .select(
        "id, school_id, team_id, category_id, coach_id, session_date, start_time, end_time, location, objective, status",
      )
      .order("session_date", { ascending: false })
      .limit(limit ?? 50);
    if (school_id) query = query.eq("school_id", school_id);
    if (team_id) query = query.eq("team_id", team_id);
    if (status) query = query.eq("status", status);
    if (from) query = query.gte("session_date", from);
    if (to) query = query.lte("session_date", to);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
