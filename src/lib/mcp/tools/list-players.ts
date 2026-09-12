import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_players",
  title: "Listar jugadores",
  description:
    "Lista los jugadores visibles para el usuario autenticado. Se puede filtrar por escuela, equipo, categoría, estado o texto del nombre.",
  inputSchema: {
    school_id: z.string().uuid().optional().describe("Id de la escuela (usa list_schools)."),
    team_id: z.string().uuid().optional().describe("Id del equipo."),
    category_id: z.string().uuid().optional().describe("Id de la categoría."),
    status: z.enum(["active", "inactive", "suspended"]).optional().describe("Estado del jugador."),
    search: z.string().trim().min(1).optional().describe("Texto a buscar en el nombre."),
    limit: z.number().int().min(1).max(200).default(50).describe("Máximo de filas."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ school_id, team_id, category_id, status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("players")
      .select(
        "id, full_name, school_id, team_id, category_id, status, position, birth_date, guardian_name, guardian_email",
      )
      .order("full_name")
      .limit(limit ?? 50);
    if (school_id) query = query.eq("school_id", school_id);
    if (team_id) query = query.eq("team_id", team_id);
    if (category_id) query = query.eq("category_id", category_id);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("full_name", `%${search}%`);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
