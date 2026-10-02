import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Crown, Plus, Shuffle, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addTeam,
  autoAssignGroups,
  createCompetition,
  deleteCompetition,
  generateGroupMatches,
  generateKnockout,
  getCompetition,
  listCompetitions,
  removeTeam,
  saveResult,
  setTeamGroup,
  updateQualifiers,
  type Competition,
  type CompetitionMatch,
  type CompetitionTeam,
} from "@/lib/api/competitions";
import { listTeams } from "@/lib/api/school-data";
import {
  GROUP_STAGE,
  KNOCKOUT_STAGES,
  computeStandings,
  groupNames,
  isPlayed,
  matchWinner,
  qualifiers,
  stageForCount,
} from "@/lib/rules/tournament";
import { useTenant } from "@/lib/tenant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/competiciones")({
  validateSearch: (s: Record<string, unknown>): { id?: string } =>
    typeof s["id"] === "string" ? { id: s["id"] } : {},
  head: () => ({
    meta: [
      { title: "Competiciones — FútbolGestión" },
      {
        name: "description",
        content: "Torneos con fase de grupos, tabla de posiciones y eliminatorias hasta la final.",
      },
      { property: "og:title", content: "Competiciones — FútbolGestión" },
      {
        property: "og:description",
        content: "Organiza torneos estilo Champions League para tus equipos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompetitionsPage,
});

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Ocurrió un error";
}

function CompetitionsPage() {
  const { id } = Route.useSearch();
  return id ? <CompetitionDetail id={id} /> : <CompetitionList />;
}

/* --------------------------------- listado -------------------------------- */

function CompetitionList() {
  const { school } = useTenant();
  const schoolId = school?.id ?? "";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const q = useQuery({
    queryKey: ["competitions", schoolId],
    enabled: !!schoolId,
    queryFn: () => listCompetitions(schoolId),
  });

  const create = useMutation({
    mutationFn: () => createCompetition(schoolId, name.trim()),
    onSuccess: (c) => {
      setName("");
      qc.invalidateQueries({ queryKey: ["competitions", schoolId] });
      navigate({ to: "/competiciones", search: { id: c.id } });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Competiciones"
        description="Crea torneos con fase de grupos y eliminatorias hasta la final."
      />
      <Card className="border-border/70 bg-card/80">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="comp-name">Nueva competición</Label>
            <Input
              id="comp-name"
              placeholder="Ej. Copa Interna Sub-12 2026"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
            <Plus className="size-4" /> Crear
          </Button>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <LoadingRows rows={3} />
      ) : q.error ? (
        <ErrorState message={errMsg(q.error)} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState
          title="Aún no hay competiciones"
          description="Crea la primera para empezar a agregar equipos."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {q.data!.map((c) => (
            <Link
              key={c.id}
              to="/competiciones"
              search={{ id: c.id }}
              className="rounded-xl border border-border/70 bg-card/80 p-4 transition-colors hover:border-primary/60"
            >
              <Trophy className="mb-2 size-5 text-primary" />
              <p className="font-display font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                Creada el {new Date(c.created_at).toLocaleDateString("es-CO")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- detalle -------------------------------- */

function CompetitionDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["competition", id], queryFn: () => getCompetition(id) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["competition", id] });

  const remove = useMutation({
    mutationFn: () => deleteCompetition(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
      navigate({ to: "/competiciones", search: {} });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (q.isLoading) return <LoadingRows rows={5} />;
  if (q.error) return <ErrorState message={errMsg(q.error)} />;
  const { competition, teams, matches } = q.data!;
  const hasKnockout = matches.some((m) => m.stage !== GROUP_STAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        title={competition.name}
        description={`${teams.length} equipos · ${groupNames(teams).length} grupos`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/competiciones" search={{}}>
                <ArrowLeft className="size-4" /> Volver
              </Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm("¿Eliminar esta competición y todos sus partidos?")) remove.mutate();
              }}
            >
              <Trash2 className="size-4" /> Eliminar
            </Button>
          </>
        }
      />

      <Tabs defaultValue={hasKnockout ? "eliminatorias" : teams.length ? "grupos" : "equipos"}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="equipos">1. Equipos</TabsTrigger>
          <TabsTrigger value="grupos">2. Grupos y partidos</TabsTrigger>
          <TabsTrigger value="eliminatorias">3. Eliminatorias</TabsTrigger>
        </TabsList>
        <TabsContent value="equipos" className="mt-4">
          <TeamsTab competition={competition} teams={teams} onChange={refresh} />
        </TabsContent>
        <TabsContent value="grupos" className="mt-4">
          <GroupsTab competition={competition} teams={teams} matches={matches} onChange={refresh} />
        </TabsContent>
        <TabsContent value="eliminatorias" className="mt-4">
          <KnockoutTab
            competition={competition}
            teams={teams}
            matches={matches}
            onChange={refresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TabProps {
  competition: Competition;
  teams: CompetitionTeam[];
  matches: CompetitionMatch[];
  onChange: () => void;
}

/* --------------------------------- equipos -------------------------------- */

function TeamsTab({ competition, teams, onChange }: Omit<TabProps, "matches">) {
  const [name, setName] = useState("");
  const schoolTeams = useQuery({
    queryKey: ["school-teams", competition.school_id],
    queryFn: () => listTeams(competition.school_id),
  });

  const add = useMutation({
    mutationFn: (n: string) => {
      if (teams.some((t) => t.name.toLowerCase() === n.toLowerCase()))
        throw new Error("Ese equipo ya está en la competición.");
      return addTeam(competition, n);
    },
    onSuccess: () => {
      setName("");
      onChange();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const del = useMutation({
    mutationFn: removeTeam,
    onSuccess: onChange,
    onError: (e) => toast.error(errMsg(e)),
  });

  const available = (schoolTeams.data ?? []).filter(
    (st) => !teams.some((t) => t.name === st.name),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Agregar equipos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) add.mutate(name.trim());
            }}
          >
            <Input
              placeholder="Nombre del equipo (propio o rival)"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" disabled={!name.trim() || add.isPending}>
              <Plus className="size-4" />
            </Button>
          </form>
          {available.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">O agrega equipos de tu escuela:</p>
              <div className="flex flex-wrap gap-2">
                {available.map((st) => (
                  <Button
                    key={st.id}
                    size="sm"
                    variant="outline"
                    disabled={add.isPending}
                    onClick={() => add.mutate(st.name)}
                  >
                    <Plus className="size-3" /> {st.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Participantes ({teams.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay equipos.</p>
          ) : (
            teams.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <span>{t.name}</span>
                <div className="flex items-center gap-2">
                  {t.group_name ? <Badge variant="outline">Grupo {t.group_name}</Badge> : null}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Quitar ${t.name}`}
                    onClick={() => {
                      if (confirm(`¿Quitar ${t.name}? Se borrarán sus partidos.`)) del.mutate(t.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------------------------- grupos -------------------------------- */

function GroupsTab({ competition, teams, matches, onChange }: TabProps) {
  const [groupCount, setGroupCount] = useState(Math.max(1, Math.round(teams.length / 4)));
  const groups = groupNames(teams);
  const groupMatches = matches.filter((m) => m.stage === GROUP_STAGE);
  const letters = Array.from({ length: Math.max(groupCount, groups.length, 1) }, (_, i) =>
    String.fromCharCode(65 + i),
  );

  const auto = useMutation({
    mutationFn: () => autoAssignGroups(teams, groupCount),
    onSuccess: onChange,
    onError: (e) => toast.error(errMsg(e)),
  });
  const assign = useMutation({
    mutationFn: ({ id, g }: { id: string; g: string | null }) => setTeamGroup(id, g),
    onSuccess: onChange,
    onError: (e) => toast.error(errMsg(e)),
  });
  const gen = useMutation({
    mutationFn: () => generateGroupMatches(competition, teams),
    onSuccess: () => {
      toast.success("Partidos de grupos generados");
      onChange();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (teams.length < 2)
    return (
      <EmptyState
        title="Agrega al menos 2 equipos"
        description="Ve a la pestaña Equipos para registrar a los participantes."
      />
    );

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Organizar grupos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="group-count">Número de grupos</Label>
              <Input
                id="group-count"
                type="number"
                min={1}
                max={16}
                className="w-28"
                value={groupCount}
                onChange={(e) =>
                  setGroupCount(Math.min(16, Math.max(1, Number(e.target.value) || 1)))
                }
              />
            </div>
            <Button variant="outline" disabled={auto.isPending} onClick={() => auto.mutate()}>
              <Shuffle className="size-4" /> Sorteo automático
            </Button>
            <Button
              disabled={groups.length === 0 || gen.isPending}
              onClick={() => {
                if (
                  groupMatches.length === 0 ||
                  confirm("Se borrarán todos los partidos y resultados actuales. ¿Continuar?")
                )
                  gen.mutate();
              }}
            >
              Generar partidos de grupos
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-sm"
              >
                <span className="truncate">{t.name}</span>
                <Select
                  value={t.group_name ?? "none"}
                  onValueChange={(v) => assign.mutate({ id: t.id, g: v === "none" ? null : v })}
                >
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin grupo</SelectItem>
                    {letters.map((l) => (
                      <SelectItem key={l} value={l}>
                        Grupo {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Victoria 3 pts · Empate 1 pt · Derrota 0. Desempate: diferencia de gol y luego goles a
            favor.
          </p>
        </CardContent>
      </Card>

      {groups.map((g) => {
        const gTeams = teams.filter((t) => t.group_name === g);
        const gMatches = groupMatches.filter((m) => m.group_name === g);
        const table = computeStandings(gTeams, gMatches);
        return (
          <Card key={g} className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Grupo {g}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Equipo</TableHead>
                      {["PJ", "PG", "PE", "PP", "GF", "GC", "DG", "PTS"].map((h) => (
                        <TableHead key={h} className="text-center">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.map((r, i) => (
                      <TableRow
                        key={r.team.id}
                        className={cn(i < competition.qualifiers_per_group && "bg-primary/5")}
                      >
                        <TableCell>
                          <span
                            className={cn(
                              "inline-block w-5 text-center",
                              i < competition.qualifiers_per_group && "font-semibold text-primary",
                            )}
                          >
                            {i + 1}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{r.team.name}</TableCell>
                        {[r.pj, r.pg, r.pe, r.pp, r.gf, r.gc, r.dg, r.pts].map((v, k) => (
                          <TableCell
                            key={k}
                            className={cn("text-center", k === 7 && "font-semibold")}
                          >
                            {k === 6 && v > 0 ? `+${v}` : v}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-2">
                {gMatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Pulsa “Generar partidos de grupos” para crear el calendario.
                  </p>
                ) : (
                  gMatches.map((m) => (
                    <ScoreRow
                      key={m.id}
                      competition={competition}
                      match={m}
                      teams={teams}
                      knockout={false}
                      onSaved={onChange}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------------------------- marcador editable --------------------------- */

function ScoreRow({
  competition,
  match,
  teams,
  knockout,
  onSaved,
}: {
  competition: Competition;
  match: CompetitionMatch;
  teams: CompetitionTeam[];
  knockout: boolean;
  onSaved: () => void;
}) {
  const toStr = (v: number | null) => (v === null ? "" : String(v));
  const [hg, setHg] = useState(toStr(match.home_goals));
  const [ag, setAg] = useState(toStr(match.away_goals));
  const [hp, setHp] = useState(toStr(match.home_penalties));
  const [ap, setAp] = useState(toStr(match.away_penalties));

  useEffect(() => {
    setHg(toStr(match.home_goals));
    setAg(toStr(match.away_goals));
    setHp(toStr(match.home_penalties));
    setAp(toStr(match.away_penalties));
  }, [match.home_goals, match.away_goals, match.home_penalties, match.away_penalties]);

  const name = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "Por definir";
  const tied = knockout && hg !== "" && ag !== "" && hg === ag;
  const dirty =
    hg !== toStr(match.home_goals) ||
    ag !== toStr(match.away_goals) ||
    hp !== toStr(match.home_penalties) ||
    ap !== toStr(match.away_penalties);
  const winner = knockout ? matchWinner(match) : null;

  const save = useMutation({
    mutationFn: () => {
      const n = (s: string) => (s === "" ? null : Number(s));
      if ((hg === "") !== (ag === "")) throw new Error("Escribe los goles de ambos equipos.");
      if (tied && (hp === "" || ap === "" || hp === ap))
        throw new Error("Empate en eliminatoria: registra los penales con un ganador.");
      return saveResult(competition, match, {
        home_goals: n(hg),
        away_goals: n(ag),
        home_penalties: tied ? n(hp) : null,
        away_penalties: tied ? n(ap) : null,
      });
    },
    onSuccess: () => {
      toast.success("Resultado guardado");
      onSaved();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const goalInput = (value: string, set: (v: string) => void, label: string, small = false) => (
    <Input
      type="number"
      min={0}
      max={99}
      inputMode="numeric"
      aria-label={label}
      value={value}
      onChange={(e) => set(e.target.value === "" ? "" : String(Math.max(0, Number(e.target.value))))}
      className={cn("h-8 px-1 text-center", small ? "w-11 text-xs" : "w-12")}
    />
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 px-2 py-2 text-sm",
        isPlayed(match) && "bg-muted/20",
      )}
    >
      <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2">
        <span
          className={cn(
            "truncate text-right",
            winner && winner === match.home_team_id && "font-semibold text-primary",
          )}
        >
          {name(match.home_team_id)}
        </span>
        {goalInput(hg, setHg, `Goles ${name(match.home_team_id)}`)}
        <span className="text-muted-foreground">-</span>
        {goalInput(ag, setAg, `Goles ${name(match.away_team_id)}`)}
        <span
          className={cn(
            "truncate",
            winner && winner === match.away_team_id && "font-semibold text-primary",
          )}
        >
          {name(match.away_team_id)}
        </span>
      </div>
      {tied ? (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          Penales {goalInput(hp, setHp, "Penales local", true)} -
          {goalInput(ap, setAp, "Penales visitante", true)}
        </div>
      ) : null}
      {dirty ? (
        <div className="mt-2 flex justify-center">
          <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
            Guardar resultado
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------- eliminatorias ---------------------------- */

function KnockoutTab({ competition, teams, matches, onChange }: TabProps) {
  const groups = groupNames(teams);
  const groupMatches = matches.filter((m) => m.stage === GROUP_STAGE);
  const pendingGroup = groupMatches.filter((m) => !isPlayed(m)).length;
  const seeded = qualifiers(teams, matches, competition.qualifiers_per_group);
  const firstStage = stageForCount(seeded.length);
  const knockout = matches.filter((m) => m.stage !== GROUP_STAGE);
  const stages = KNOCKOUT_STAGES.filter((s) => knockout.some((m) => m.stage === s.key));
  const finalMatch = knockout.find((m) => m.stage === "final");
  const champion = finalMatch ? matchWinner(finalMatch) : null;

  const perGroup = useMutation({
    mutationFn: (n: number) => updateQualifiers(competition.id, n),
    onSuccess: onChange,
    onError: (e) => toast.error(errMsg(e)),
  });
  const gen = useMutation({
    mutationFn: () => generateKnockout(competition, teams, matches),
    onSuccess: () => {
      toast.success("Cuadro eliminatorio creado");
      onChange();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/80">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 text-sm">
            {groups.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <Label>Clasifican por grupo</Label>
                <Select
                  value={String(competition.qualifiers_per_group)}
                  onValueChange={(v) => perGroup.mutate(Number(v))}
                >
                  <SelectTrigger className="h-8 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Sin grupos: todos los equipos pasan directo a la eliminatoria.
              </p>
            )}
            <p className="text-muted-foreground">
              {seeded.length} clasificados →{" "}
              {firstStage ? (
                <strong className="text-foreground">
                  {KNOCKOUT_STAGES.find((s) => s.key === firstStage)!.label}
                </strong>
              ) : (
                <span className="text-destructive">
                  se necesitan 2, 4, 8, 16 o 32 para armar el cuadro
                </span>
              )}
            </p>
            {pendingGroup > 0 ? (
              <p className="text-xs text-muted-foreground">
                Faltan {pendingGroup} partidos de grupos por jugar.
              </p>
            ) : null}
          </div>
          <Button
            disabled={!firstStage || gen.isPending}
            onClick={() => {
              if (
                (pendingGroup === 0 ||
                  confirm("Aún hay partidos de grupos sin resultado. ¿Crear el cuadro igualmente?")) &&
                (knockout.length === 0 ||
                  confirm("Se reemplazará el cuadro eliminatorio actual. ¿Continuar?"))
              )
                gen.mutate();
            }}
          >
            {knockout.length ? "Rehacer cuadro eliminatorio" : "Crear cuadro eliminatorio"}
          </Button>
        </CardContent>
      </Card>

      {champion ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-primary/50 bg-primary/10 p-5">
          <Crown className="size-7 text-primary" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Campeón</p>
            <p className="font-display text-2xl font-semibold">
              {teams.find((t) => t.id === champion)?.name}
            </p>
          </div>
        </div>
      ) : null}

      {stages.length === 0 ? (
        <EmptyState
          title="Todavía no hay cuadro eliminatorio"
          description="Cuando termine la fase de grupos, crea el cuadro con los clasificados."
        />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {stages.map((s) => {
              const round = knockout
                .filter((m) => m.stage === s.key)
                .sort((a, b) => a.slot - b.slot);
              return (
                <div key={s.key} className="flex w-72 flex-col">
                  <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-primary">
                    {s.label}
                  </p>
                  <div className="flex flex-1 flex-col justify-around gap-3">
                    {round.map((m) => (
                      <ScoreRow
                        key={m.id}
                        competition={competition}
                        match={m}
                        teams={teams}
                        knockout
                        onSaved={onChange}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Partido único: si hay empate se definen penales. Al completar cada ronda, la siguiente se crea
        sola con los ganadores.
      </p>
    </div>
  );
}
