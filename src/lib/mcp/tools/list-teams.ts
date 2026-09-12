import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_teams",
  title: "Listar equipos y categorías",
  description:
    "Lista los equipos y las categorías de una escuela visible para el usuario autenticado.",
  inputSchema: {
    school_id: z.string().uuid().optional().describe("Id de la escuela (usa list_schools)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ school_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let teams = supabase
      .from("teams")
      .select("id, name, school_id, category_id, coach_id, season")
      .order("name");
    let categories = supabase
      .from("categories")
      .select("id, name, school_id, min_age, max_age")
      .order("name");
    if (school_id) {
      teams = teams.eq("school_id", school_id);
      categories = categories.eq("school_id", school_id);
    }
    const [teamsRes, categoriesRes] = await Promise.all([teams, categories]);
    if (teamsRes.error) return errorResult(teamsRes.error.message);
    if (categoriesRes.error) return errorResult(categoriesRes.error.message);
    return jsonResult({ teams: teamsRes.data ?? [], categories: categoriesRes.data ?? [] });
  },
});
