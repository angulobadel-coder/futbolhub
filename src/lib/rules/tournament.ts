/** Reglas puras del sistema de competiciones (grupos + eliminatorias). */

export const KNOCKOUT_STAGES = [
  { key: "dieciseisavos", label: "Dieciseisavos de final", size: 32 },
  { key: "octavos", label: "Octavos de final", size: 16 },
  { key: "cuartos", label: "Cuartos de final", size: 8 },
  { key: "semifinal", label: "Semifinal", size: 4 },
  { key: "final", label: "Final", size: 2 },
] as const;

export type KnockoutStage = (typeof KNOCKOUT_STAGES)[number]["key"];
export const GROUP_STAGE = "grupos";

export interface TeamLite {
  id: string;
  name: string;
  group_name: string | null;
}

export interface MatchLite {
  id: string;
  stage: string;
  group_name: string | null;
  slot: number;
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
}

export interface StandingRow {
  team: TeamLite;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
}

export function stageLabel(stage: string) {
  return KNOCKOUT_STAGES.find((s) => s.key === stage)?.label ?? "Fase de grupos";
}

/** Fase inicial de eliminación según el número de clasificados (potencia de 2). */
export function stageForCount(count: number): KnockoutStage | null {
  return KNOCKOUT_STAGES.find((s) => s.size === count)?.key ?? null;
}

export function nextStage(stage: string): KnockoutStage | null {
  const i = KNOCKOUT_STAGES.findIndex((s) => s.key === stage);
  if (i < 0 || i === KNOCKOUT_STAGES.length - 1) return null;
  return KNOCKOUT_STAGES[i + 1]!.key;
}

export function isPlayed(m: MatchLite) {
  return m.home_goals !== null && m.away_goals !== null;
}

/** Ganador de un partido eliminatorio (en empate decide la tanda de penales). */
export function matchWinner(m: MatchLite): string | null {
  if (!isPlayed(m) || !m.home_team_id || !m.away_team_id) return null;
  if (m.home_goals! > m.away_goals!) return m.home_team_id;
  if (m.home_goals! < m.away_goals!) return m.away_team_id;
  if (m.home_penalties === null || m.away_penalties === null) return null;
  if (m.home_penalties > m.away_penalties) return m.home_team_id;
  if (m.home_penalties < m.away_penalties) return m.away_team_id;
  return null;
}

/** Tabla de posiciones: victoria 3, empate 1, derrota 0. Desempate: PTS, DG, GF, nombre. */
export function computeStandings(teams: TeamLite[], matches: MatchLite[]): StandingRow[] {
  const rows = new Map<string, StandingRow>(
    teams.map((team) => [
      team.id,
      { team, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 },
    ]),
  );
  for (const m of matches) {
    if (m.stage !== GROUP_STAGE || !isPlayed(m)) continue;
    const home = m.home_team_id ? rows.get(m.home_team_id) : undefined;
    const away = m.away_team_id ? rows.get(m.away_team_id) : undefined;
    if (!home || !away) continue;
    const hg = m.home_goals!;
    const ag = m.away_goals!;
    home.pj++;
    away.pj++;
    home.gf += hg;
    home.gc += ag;
    away.gf += ag;
    away.gc += hg;
    if (hg > ag) {
      home.pg++;
      away.pp++;
      home.pts += 3;
    } else if (hg < ag) {
      away.pg++;
      home.pp++;
      away.pts += 3;
    } else {
      home.pe++;
      away.pe++;
      home.pts++;
      away.pts++;
    }
  }
  return [...rows.values()]
    .map((r) => ({ ...r, dg: r.gf - r.gc }))
    .sort(
      (a, b) =>
        b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.team.name.localeCompare(b.team.name),
    );
}

export function groupNames(teams: TeamLite[]) {
  return [...new Set(teams.map((t) => t.group_name).filter((g): g is string => !!g))].sort();
}

/** Partidos todos contra todos dentro de cada grupo. */
export function roundRobin(teams: TeamLite[]) {
  const out: { group_name: string; home: string; away: string; slot: number }[] = [];
  for (const g of groupNames(teams)) {
    const members = teams.filter((t) => t.group_name === g);
    let slot = 0;
    for (let i = 0; i < members.length; i++)
      for (let j = i + 1; j < members.length; j++)
        out.push({ group_name: g, home: members[i]!.id, away: members[j]!.id, slot: slot++ });
  }
  return out;
}

/**
 * Clasificados ordenados por sembrado: primero todos los 1º de grupo, luego los 2º, etc.
 * Sin grupos, todos los equipos clasifican en el orden recibido.
 */
export function qualifiers(teams: TeamLite[], matches: MatchLite[], perGroup: number): StandingRow[] {
  const groups = groupNames(teams);
  if (groups.length === 0) return computeStandings(teams, []);
  const byPosition: StandingRow[][] = [];
  for (const g of groups) {
    const table = computeStandings(
      teams.filter((t) => t.group_name === g),
      matches.filter((m) => m.group_name === g),
    );
    table.slice(0, perGroup).forEach((row, pos) => (byPosition[pos] ??= []).push(row));
  }
  return byPosition.flatMap((rows) =>
    [...rows].sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf),
  );
}

/** Orden clásico de cuadro: 1v16, 8v9, 4v13… para que los mejores se crucen al final. */
function bracketOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const n = order.length * 2 + 1;
    order = order.flatMap((s) => [s, n - s]);
  }
  return order;
}

/** Cruces de la primera ronda eliminatoria a partir de los clasificados sembrados. */
export function firstRoundPairs(seeded: TeamLite[]) {
  const order = bracketOrder(seeded.length);
  const pairs: { home: string; away: string; slot: number }[] = [];
  for (let i = 0; i < order.length; i += 2) {
    pairs.push({
      home: seeded[order[i]! - 1]!.id,
      away: seeded[order[i + 1]! - 1]!.id,
      slot: i / 2,
    });
  }
  return pairs;
}
