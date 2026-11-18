import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardCheck, Percent, Shield, TriangleAlert, Trophy, UserRound, Users } from "lucide-react";

import { useTenant } from "@/lib/tenant";
import { useSchoolSettings } from "@/lib/api/settings";
import { listCategories, listCoaches, listPlayers, listTeams } from "@/lib/api/school-data";
import { listAttendance, listTrainingSessions } from "@/lib/api/training";
import { resolveScope, sessionInScope } from "@/lib/api/scope";
import { LOW_ATTENDANCE_THRESHOLD, averageAttendance, computeAttendance, lowAttendancePlayers } from "@/lib/rules/attendance";
import { evaluateAlerts } from "@/lib/rules/alerts";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — FútbolGestión" },
      { name: "description", content: "Panel general de la escuela: indicadores, alertas y estado deportivo." },
      { property: "og:title", content: "Dashboard — FútbolGestión" },
      { property: "og:description", content: "Panel general de la escuela: indicadores, alertas y estado deportivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { school, role, user } = useTenant();
  const threshold = useSchoolSettings(school?.id).data?.attendance_threshold ?? LOW_ATTENDANCE_THRESHOLD;
  const schoolId = school?.id;

  const query = useQuery({
    queryKey: ["school-snapshot", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const [players, coaches, categories, teams, sessions, attendance] = await Promise.all([
        listPlayers(schoolId!),
        listCoaches(schoolId!),
        listCategories(schoolId!),
        listTeams(schoolId!),
        listTrainingSessions(schoolId!),
        listAttendance(schoolId!),
      ]);
      return { players, coaches, categories, teams, sessions, attendance };
    },
  });

  if (query.isLoading) return <LoadingRows rows={6} />;
  if (query.error) return <ErrorState message={query.error.message} />;
  if (!query.data) return null;

  const { players, coaches, categories, teams, attendance } = query.data;
  const scope = resolveScope({ role, userId: user?.id, coaches, teams, players });
  const sessions = query.data.sessions.filter((s) => sessionInScope(s, scope));
  const sessionIds = new Set(sessions.map((s) => s.id));
  const scopedAttendance = attendance.filter((a) => sessionIds.has(a.session_id));
  const scopedPlayers = scope.playerIds
    ? players.filter((p) => scope.playerIds!.includes(p.id))
    : players;

  const activePlayers = players.filter((p) => p.status === "activo");
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sessions.filter((s) => s.status === "programado" && s.session_date >= today);
  const done = sessions.filter((s) => s.status === "realizado");
  const stats = computeAttendance(scopedAttendance, sessions);
  const average = averageAttendance(stats);
  const lowAttendance = lowAttendancePlayers(stats, scopedPlayers, threshold);

  const alerts = evaluateAlerts({
    players: scopedPlayers,
    coaches,
    categories,
    teams,
    sessions,
    attendance: scopedAttendance,
  });

  return (
    <>
      <PageHeader
        title={`Panel — ${school?.name ?? "Escuela"}`}
        description="Resumen del estado deportivo y administrativo de la escuela."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Jugadores activos"
          value={activePlayers.length}
          hint={`${players.length} registrados en total`}
          icon={Users}
        />
        <StatCard label="Entrenadores" value={coaches.filter((c) => c.status === "activo").length} icon={UserRound} />
        <StatCard label="Categorías" value={categories.length} icon={Shield} />
        <StatCard label="Equipos" value={teams.length} icon={Trophy} />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Próximos entrenamientos"
          value={upcoming.length}
          hint={upcoming[upcoming.length - 1] ? `Siguiente: ${upcoming[upcoming.length - 1]!.session_date}` : undefined}
          icon={CalendarDays}
        />
        <StatCard label="Entrenamientos realizados" value={done.length} icon={ClipboardCheck} />
        <StatCard
          label="Asistencia promedio"
          value={average === null ? "—" : `${average}%`}
          hint={average === null ? "Sin registros de asistencia" : undefined}
          icon={Percent}
        />
        <StatCard
          label="Alertas de asistencia"
          value={lowAttendance.length}
          hint="Jugadores por debajo del 70%"
          icon={TriangleAlert}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Alertas de seguimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <EmptyState
                title="Sin alertas"
                description="No se detectaron situaciones que requieran atención."
              />
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-lg border p-3",
                    alert.level === "critical" && "border-destructive/50 bg-destructive/10",
                    alert.level === "warning" && "border-warning/50 bg-warning/10",
                    alert.level === "info" && "border-accent/50 bg-accent/10",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {alert.level === "critical" ? "crítica" : alert.level === "warning" ? "atención" : "info"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{alert.detail}</p>
                  <p className="mt-1.5 text-xs">
                    <span className="text-muted-foreground">Recomendación: </span>
                    {alert.recommendation}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Distribución por categoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.length === 0 ? (
              <EmptyState title="Sin categorías" description="Crea la primera categoría de la escuela." />
            ) : (
              categories.map((cat) => {
                const count = players.filter((p) => p.category_id === cat.id).length;
                const pct = players.length === 0 ? 0 : Math.round((count / players.length) * 100);
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{cat.name}</span>
                      <span className="text-muted-foreground">
                        {count} jugador{count === 1 ? "" : "es"}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Equipos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {teams.length === 0 ? (
            <EmptyState title="Sin equipos" description="Crea el primer equipo desde el módulo Equipos." />
          ) : (
            teams.map((team) => {
              const coach = coaches.find((c) => c.id === team.coach_id);
              const count = players.filter((p) => p.team_id === team.id).length;
              return (
                <div
                  key={team.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-2.5 text-sm"
                >
                  <span className="font-medium">{team.name}</span>
                  <span className="text-muted-foreground">
                    {coach ? coach.full_name : "Sin entrenador"} · {count} jugadores
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </>
  );
}
