import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_schools",
  title: "Listar escuelas",
  description:
    "Lista las escuelas de fútbol a las que el usuario autenticado tiene acceso, con su id, nombre, ciudad y estado.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("schools")
      .select("id, name, city, slug, is_active")
      .order("name");
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
