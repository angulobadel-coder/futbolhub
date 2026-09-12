import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_training_session",
  title: "Crear entrenamiento",
  description:
    "Programa un nuevo entrenamiento en una escuela. Requiere permisos de administrador o entrenador de esa escuela.",
  inputSchema: {
    school_id: z.string().uuid().describe("Id de la escuela (usa list_schools)."),
    session_date: z.string().date().describe("Fecha del entrenamiento en formato YYYY-MM-DD."),
    start_time: z.string().describe("Hora de inicio, formato HH:MM."),
    end_time: z.string().optional().describe("Hora de fin, formato HH:MM."),
    team_id: z.string().uuid().optional().describe("Id del equipo."),
    category_id: z.string().uuid().optional().describe("Id de la categoría."),
    coach_id: z.string().uuid().optional().describe("Id del entrenador responsable."),
    location: z.string().trim().optional().describe("Lugar del entrenamiento."),
    objective: z.string().trim().optional().describe("Objetivo de la sesión."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("training_sessions")
      .insert({ ...input, status: "scheduled" })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});
