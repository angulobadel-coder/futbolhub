import { supabase, unwrap } from "./client";
import type { Database } from "@/integrations/supabase/types";
import {
  GROUP_STAGE,
  firstRoundPairs,
  matchWinner,
  nextStage,
  qualifiers,
  roundRobin,
  stageForCount,
} from "@/lib/rules/tournament";

type T = Database["public"]["Tables"];
export type Competition = T["competitions"]["Row"];
export type CompetitionTeam = T["competition_teams"]["Row"];
export type CompetitionMatch = T["competition_matches"]["Row"];

export async function listCompetitions(schoolId: string): Promise<Competition[]> {
  return (
    unwrap(
      await supabase
        .from("competitions")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
    ) ?? []
  );
}

export async function getCompetition(id: string) {
  const [comp, teams, matches] = await Promise.all([
    supabase.from("competitions").select("*").eq("id", id).single(),
    supabase.from("competition_teams").select("*").eq("competition_id", id).order("created_at"),
    supabase.from("competition_matches").select("*").eq("competition_id", id).order("slot"),
  ]);
  return {
    competition: unwrap(comp) as Competition,
    teams: (unwrap(teams) ?? []) as CompetitionTeam[],
    matches: (unwrap(matches) ?? []) as CompetitionMatch[],
  };
}

export async function createCompetition(schoolId: string, name: string) {
  return unwrap(
    await supabase.from("competitions").insert({ school_id: schoolId, name }).select().single(),
  ) as Competition;
}

export async function deleteCompetition(id: string) {
  const { error } = await supabase.from("competitions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateQualifiers(id: string, perGroup: number) {
  const { error } = await supabase
    .from("competitions")
    .update({ qualifiers_per_group: perGroup })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addTeam(comp: Competition, name: string) {
  const { error } = await supabase
    .from("competition_teams")
    .insert({ competition_id: comp.id, school_id: comp.school_id, name });
  if (error) throw new Error(error.message);
}

export async function removeTeam(id: string) {
  const { error } = await supabase.from("competition_teams").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setTeamGroup(id: string, group: string | null) {
  const { error } = await supabase.from("competition_teams").update({ group_name: group }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Reparte los equipos en N grupos (A, B, C…) de forma equilibrada. */
export async function autoAssignGroups(teams: CompetitionTeam[], groupCount: number) {
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  await Promise.all(
    shuffled.map((t, i) => setTeamGroup(t.id, String.fromCharCode(65 + (i % groupCount)))),
  );
}

async function clearMatches(competitionId: string, stages: "group" | "knockout" | "all") {
  let q = supabase.from("competition_matches").delete().eq("competition_id", competitionId);
  if (stages === "group") q = q.eq("stage", GROUP_STAGE);
  if (stages === "knockout") q = q.neq("stage", GROUP_STAGE);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

/** Crea (o recrea) los partidos todos contra todos de la fase de grupos. */
export async function generateGroupMatches(comp: Competition, teams: CompetitionTeam[]) {
  await clearMatches(comp.id, "all");
  const rows = roundRobin(teams).map((m) => ({
    competition_id: comp.id,
    school_id: comp.school_id,
    stage: GROUP_STAGE,
    group_name: m.group_name,
    slot: m.slot,
    home_team_id: m.home,
    away_team_id: m.away,
  }));
  if (rows.length === 0) throw new Error("Asigna equipos a los grupos primero.");
  const { error } = await supabase.from("competition_matches").insert(rows);
  if (error) throw new Error(error.message);
}

/** Crea la primera ronda eliminatoria con los clasificados actuales. */
export async function generateKnockout(
  comp: Competition,
  teams: CompetitionTeam[],
  matches: CompetitionMatch[],
) {
  const seeded = qualifiers(teams, matches, comp.qualifiers_per_group).map((r) => r.team);
  const stage = stageForCount(seeded.length);
  if (!stage)
    throw new Error(
      `Hay ${seeded.length} clasificados. Para la eliminatoria se necesitan 2, 4, 8, 16 o 32 equipos.`,
    );
  await clearMatches(comp.id, "knockout");
  const rows = firstRoundPairs(seeded).map((p) => ({
    competition_id: comp.id,
    school_id: comp.school_id,
    stage,
    slot: p.slot,
    home_team_id: p.home,
    away_team_id: p.away,
  }));
  const { error } = await supabase.from("competition_matches").insert(rows);
  if (error) throw new Error(error.message);
}

export interface ResultInput {
  home_goals: number | null;
  away_goals: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
}

/**
 * Guarda un resultado. En eliminatorias, cuando toda la ronda tiene ganador se crea
 * automáticamente la siguiente; si se corrige un resultado, las rondas posteriores se rehacen.
 */
export async function saveResult(comp: Competition, match: CompetitionMatch, result: ResultInput) {
  const { error } = await supabase.from("competition_matches").update(result).eq("id", match.id);
  if (error) throw new Error(error.message);
  if (match.stage === GROUP_STAGE) return;

  const { matches } = await getCompetition(comp.id);
  const updated = matches.find((m) => m.id === match.id)!;
  let stage: string | null = match.stage;

  // Si cambió el ganador, se invalidan las rondas siguientes.
  const after = nextStage(match.stage);
  if (after && matchWinner(updated) !== matchWinner(match)) {
    let s: string | null = after;
    while (s) {
      await supabase.from("competition_matches").delete().eq("competition_id", comp.id).eq("stage", s);
      s = nextStage(s);
    }
  }

  const fresh = (await getCompetition(comp.id)).matches;
  while (stage) {
    const round = fresh.filter((m) => m.stage === stage).sort((a, b) => a.slot - b.slot);
    const winners = round.map(matchWinner);
    const next = nextStage(stage);
    if (!next || winners.some((w) => !w) || fresh.some((m) => m.stage === next)) return;
    const rows = [];
    for (let i = 0; i < winners.length; i += 2) {
      rows.push({
        competition_id: comp.id,
        school_id: comp.school_id,
        stage: next,
        slot: i / 2,
        home_team_id: winners[i]!,
        away_team_id: winners[i + 1]!,
      });
    }
    const { error: insErr } = await supabase.from("competition_matches").insert(rows);
    if (insErr) throw new Error(insErr.message);
    stage = null;
  }
}
