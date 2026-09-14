import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listSchools from "./tools/list-schools";
import listPlayers from "./tools/list-players";
import listTeams from "./tools/list-teams";
import listTrainingSessions from "./tools/list-training-sessions";
import attendanceSummary from "./tools/attendance-summary";
import createTrainingSession from "./tools/create-training-session";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "teamtactics-hub",
  title: "TeamTactics Hub",
  version: "0.1.0",
  instructions:
    "Herramientas de FútbolGestión para escuelas de fútbol. Empieza con `list_schools` para obtener el id de la escuela y úsalo en el resto de herramientas. Todo respeta el rol y la escuela del usuario autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listSchools,
    listTeams,
    listPlayers,
    listTrainingSessions,
    attendanceSummary,
    createTrainingSession,
  ],
});
