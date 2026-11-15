import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stars } from "@/components/evaluations/stars";
import { EvaluationHistory } from "@/components/evaluations/evaluation-history";
import { listCoaches, listPlayers, listTeams } from "@/lib/api/school-data";
import { listEvaluations, removeEvaluation, saveEvaluation } from "@/lib/api/evaluations";
import { resolveScope } from "@/lib/api/scope";
import { evaluationAverage, PILLARS, suggestedPeriods, type Scores } from "@/lib/rules/evaluations";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/_authenticated/evaluaciones")({
  head: () => ({
    meta: [
      { title: "Evaluaciones de jugadores — FútbolGestión" },
      { name: "description", content: "Califica a tus jugadores de 1 a 5 estrellas en técnica, táctica, física y actitud." },
      { property: "og:title", content: "Evaluaciones de jugadores — FútbolGestión" },
      { property: "og:description", content: "Boletín deportivo por período para cada jugador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EvaluationsPage,
});

const EMPTY: Scores = { technique: 3, tactics: 3, physical: 3, attitude: 3 };

function EvaluationsPage() {
  const { school, role, user } = useTenant();
  const schoolId = school?.id ?? "";
  const qc = useQueryClient();
  const [playerId, setPlayerId] = useState("");
  const [scores, setScores] = useState<Scores>(EMPTY);
  const periods = useMemo(() => suggestedPeriods(new Date()), []);
  const [period, setPeriod] = useState(periods[1]!);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");

  const q = useQuery({
    queryKey: ["evaluations", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const [players, teams, coaches, evaluations] = await Promise.all([
        listPlayers(schoolId), listTeams(schoolId), listCoaches(schoolId), listEvaluations(schoolId),
      ]);
      return { players, teams, coaches, evaluations };
    },
  });

  const save = useMutation({
    mutationFn: () =>
      saveEvaluation({
        school_id: schoolId, player_id: playerId, period, evaluated_on: date, ...scores,
        strengths: strengths || null, improvements: improvements || null, created_by: user?.id ?? null,
      }),
    onSuccess: () => {
      toast.success("Evaluación guardada");
      setScores(EMPTY); setStrengths(""); setImprovements("");
      qc.invalidateQueries({ queryKey: ["evaluations", schoolId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: removeEvaluation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluations", schoolId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <LoadingRows rows={5} />;
  if (q.error) return <ErrorState message={(q.error as Error).message} />;
  if (!q.data) return null;

  const scope = resolveScope({ role, userId: user?.id, ...q.data });
  const players = q.data.players
    .filter((p) => p.status === "activo")
    .filter((p) => scope.seesAll || (p.team_id && scope.teamIds.includes(p.team_id)) || (p.category_id && scope.categoryIds.includes(p.category_id)))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  const selected = players.find((p) => p.id === playerId);
  const history = q.data.evaluations.filter((e) => e.player_id === playerId);
  const latest = new Map<string, number>();
  for (const e of q.data.evaluations) if (!latest.has(e.player_id)) latest.set(e.player_id, evaluationAverage(e));

  return (
    <div className="space-y-6">
      <PageHeader title="Evaluaciones" description="Califica de 1 a 5 estrellas los 4 pilares formativos de cada jugador." />
      {players.length === 0 ? (
        <EmptyState title="No tienes jugadores para evaluar" description="Asigna jugadores a tus equipos primero." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="border-border/70 bg-card/80">
            <CardHeader><CardTitle className="text-base">Jugadores</CardTitle></CardHeader>
            <CardContent className="max-h-[600px] space-y-1 overflow-y-auto">
              {players.map((p) => (
                <button key={p.id} type="button" onClick={() => setPlayerId(p.id)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent ${p.id === playerId ? "bg-accent font-medium" : ""}`}>
                  <span className="truncate">{p.full_name}</span>
                  <span className="text-xs text-muted-foreground">{latest.has(p.id) ? `${latest.get(p.id)!.toFixed(1)}★` : "—"}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {!selected ? (
            <EmptyState title="Elige un jugador" description="Selecciónalo en la lista para evaluarlo y ver su historial." />
          ) : (
            <div className="space-y-4">
              <Card className="border-border/70 bg-card/80">
                <CardHeader><CardTitle className="text-base">Nueva evaluación · {selected.full_name}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Período</Label>
                      <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{periods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Fecha</Label>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PILLARS.map((p) => (
                      <div key={p.key} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                        <span className="text-sm">{p.label}</span>
                        <Stars value={scores[p.key]} onChange={(v) => setScores({ ...scores, [p.key]: v })} />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm">Promedio: <strong className="text-primary">{evaluationAverage(scores).toFixed(1)} / 5</strong></p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><Label>Fortalezas</Label><Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} /></div>
                    <div className="space-y-1"><Label>Aspectos a mejorar</Label><Textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} /></div>
                  </div>
                  <Button disabled={save.isPending || !date} onClick={() => save.mutate()}>Guardar evaluación</Button>
                </CardContent>
              </Card>
              <Card className="border-border/70 bg-card/80">
                <CardHeader><CardTitle className="text-base">Historial</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <EvaluationHistory items={history} />
                  {history.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {history.map((e) => (
                        <Button key={e.id} size="sm" variant="ghost" onClick={() => confirm("¿Borrar esta evaluación?") && del.mutate(e.id)}>
                          <Trash2 className="size-3.5" /> Borrar {e.period}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
