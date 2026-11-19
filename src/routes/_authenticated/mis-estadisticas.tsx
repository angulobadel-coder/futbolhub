import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Clock, Star, XCircle } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { listCategories, listPlayers, listTeams } from "@/lib/api/school-data";
import { listAttendance, listTrainingSessions } from "@/lib/api/training";
import { listEvaluations } from "@/lib/api/evaluations";
import { computeAttendance } from "@/lib/rules/attendance";
import { evaluationAverage, PILLARS } from "@/lib/rules/evaluations";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/_authenticated/mis-estadisticas")({
  head: () => ({
    meta: [
      { title: "Mis estadísticas — FútbolGestión" },
      { name: "description", content: "Tu asistencia, horas de entrenamiento y evolución por pilares deportivos." },
      { property: "og:title", content: "Mis estadísticas — FútbolGestión" },
      { property: "og:description", content: "Tu evolución deportiva personal en FútbolGestión." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlayerStats,
});

function minutesBetween(start: string | null, end: string | null) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh! * 60 + em!) - (sh! * 60 + sm!));
}

function PlayerStats() {
  const { school, user } = useTenant();
  const schoolId = school?.id ?? "";
  const q = useQuery({
    queryKey: ["player-stats", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const [players, teams, categories, sessions, attendance, evaluations] = await Promise.all([
        listPlayers(schoolId),
        listTeams(schoolId),
        listCategories(schoolId),
        listTrainingSessions(schoolId),
        listAttendance(schoolId),
        listEvaluations(schoolId),
      ]);
      return { players, teams, categories, sessions, attendance, evaluations };
    },
  });

  if (q.isLoading) return <LoadingRows rows={5} />;
  if (q.error) return <ErrorState message={(q.error as Error).message} />;
  if (!q.data) return null;
  const { players, teams, categories, sessions, attendance, evaluations } = q.data;
  const me = players.find((p) => p.user_id === user?.id) ?? players[0];
  if (!me) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mis estadísticas" />
        <EmptyState title="Tu cuenta aún no está vinculada" description="Pide a la escuela que asocie tu ficha de jugador." />
      </div>
    );
  }

  const mine = attendance.filter((a) => a.player_id === me.id);
  const mySessions = sessions.filter(
    (s) => (me.team_id && s.team_id === me.team_id) || (me.category_id && s.category_id === me.category_id),
  );
  const stat = computeAttendance(mine, mySessions).get(me.id);
  const present = mine.filter((a) => a.status === "presente");
  const absent = mine.filter((a) => a.status === "ausente").length;
  const justified = mine.filter((a) => a.status === "justificado").length;
  const minutes = present.reduce((acc, a) => {
    const s = sessions.find((x) => x.id === a.session_id);
    return acc + (s ? minutesBetween(s.start_time, s.end_time) : 0);
  }, 0);

  const myEvals = evaluations.filter((e) => e.player_id === me.id);
  const pillarAvg = PILLARS.map((p) => ({
    ...p,
    value: myEvals.length ? myEvals.reduce((acc, e) => acc + (e[p.key] as number), 0) / myEvals.length : 0,
  }));
  const overall = myEvals.length ? evaluationAverage({
    technique: pillarAvg[0]!.value, tactics: pillarAvg[1]!.value, physical: pillarAvg[2]!.value, attitude: pillarAvg[3]!.value,
  }) : null;

  const team = teams.find((t) => t.id === me.team_id);
  const category = categories.find((c) => c.id === me.category_id);

  return (
    <div className="space-y-6">
      <PageHeader title="Mis estadísticas" description="Tu asistencia, tus horas en la cancha y tu evolución." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Asistencia" value={stat ? `${stat.percentage}%` : "—"} hint={`${present.length} sesiones presentes`} icon={CalendarCheck} />
        <StatCard label="Ausencias" value={absent} hint={`${justified} justificadas`} icon={XCircle} />
        <StatCard label="Horas entrenadas" value={`${Math.floor(minutes / 60)} h ${minutes % 60} min`} hint="Sesiones a las que asististe" icon={Clock} />
        <StatCard label="Promedio evaluaciones" value={overall !== null ? `${overall} / 5` : "—"} hint={`${myEvals.length} evaluaciones`} icon={Star} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/80">
          <CardHeader><CardTitle className="text-base">Rendimiento por pilar</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {myEvals.length === 0 ? (
              <p className="text-muted-foreground">Aún no tienes evaluaciones.</p>
            ) : (
              pillarAvg.map((p) => (
                <div key={p.key} className="space-y-1">
                  <div className="flex justify-between"><span>{p.label}</span><span className="font-medium">{p.value.toFixed(1)} / 5</span></div>
                  <Progress value={(p.value / 5) * 100} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader><CardTitle className="text-base">Mi ficha deportiva</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Equipo</p><p className="font-medium">{team?.name ?? "Sin equipo"}</p></div>
            <div><p className="text-xs text-muted-foreground">Categoría</p><p className="font-medium">{category?.name ?? "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Posición</p><p className="font-medium">{me.position ?? "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Sesiones registradas</p><p className="font-medium">{mine.length}</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
