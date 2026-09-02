import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, ClipboardCheck, Dumbbell, Users } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCoaches, listPlayers, listTeams } from "@/lib/api/school-data";
import { listAttendance, listTrainingSessions } from "@/lib/api/training";
import { resolveScope, sessionInScope } from "@/lib/api/scope";
import {
  averageAttendance,
  computeAttendance,
  lowAttendancePlayers,
} from "@/lib/rules/attendance";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/_authenticated/entrenador")({
  head: () => ({
    meta: [
      { title: "Panel del entrenador — FútbolGestión" },
      {
        name: "description",
        content:
          "Equipos asignados, próximos entrenamientos, asistencia pendiente y alertas de tus jugadores.",
      },
      { property: "og:title", content: "Panel del entrenador — FútbolGestión" },
      {
        property: "og:description",
        content: "Tu operación deportiva diaria en FútbolGestión.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoachDashboard,
});

const today = () => new Date().toISOString().slice(0, 10);

function CoachDashboard() {
  const { school, role, user } = useTenant();
  const schoolId = school?.id ?? "";

  const q = useQuery({
    queryKey: ["coach-dashboard", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const [coaches, teams, players, sessions, attendance] = await Promise.all([
        listCoaches(schoolId),
        listTeams(schoolId),
        listPlayers(schoolId),
        listTrainingSessions(schoolId),
        listAttendance(schoolId),
      ]);
      return { coaches, teams, players, sessions, attendance };
    },
  });

  if (q.isLoading) return <LoadingRows rows={5} />;
  if (q.error) return <ErrorState message={(q.error as Error).message} />;

  const { coaches, teams, players, sessions, attendance } = q.data!;
  const scope = resolveScope({ role, userId: user?.id, coaches, teams, players });
  const myTeams = teams.filter((t) => scope.teamIds.includes(t.id));
  const myPlayers = players.filter(
    (p) =>
      (p.team_id && scope.teamIds.includes(p.team_id)) ||
      (p.category_id && scope.categoryIds.includes(p.category_id)),
  );
  const mySessions = sessions.filter((s) => sessionInScope(s, scope));
  const myPlayerIds = new Set(myPlayers.map((p) => p.id));
  const stats = computeAttendance(
    attendance.filter((a) => myPlayerIds.has(a.player_id)),
    mySessions,
  );

  const upcoming = mySessions
    .filter((s) => s.status === "programado" && s.session_date >= today())
    .sort((a, b) => a.session_date.localeCompare(b.session_date));

  const withAttendance = new Set(attendance.map((a) => a.session_id));
  const pending = mySessions.filter(
    (s) => s.status === "realizado" && !withAttendance.has(s.id),
  );
  const low = lowAttendancePlayers(stats, myPlayers);
  const average = averageAttendance(stats);

  if (!scope.coachId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Panel del entrenador" />
        <EmptyState
          title="Tu usuario aún no está vinculado a una ficha de entrenador"
          description="Pide al administrador de tu escuela que asocie tu correo a tu perfil de entrenador para ver tus equipos."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tu panel deportivo"
        description="Equipos asignados, entrenamientos y asistencia de tus jugadores."
        actions={
          <Button asChild variant="outline">
            <Link to="/entrenamientos">
              <Dumbbell className="size-4" /> Ir a entrenamientos
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Equipos asignados" value={myTeams.length} icon={Users} />
        <StatCard label="Jugadores a cargo" value={myPlayers.length} icon={Users} />
        <StatCard
          label="Próximos entrenamientos"
          value={upcoming.length}
          hint={upcoming[0] ? `Siguiente: ${upcoming[0].session_date}` : undefined}
          icon={CalendarDays}
        />
        <StatCard
          label="Asistencia promedio"
          value={average === null ? "—" : `${average}%`}
          hint={low.length > 0 ? `${low.length} en alerta` : undefined}
          icon={ClipboardCheck}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Próximos entrenamientos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin sesiones programadas.</p>
            ) : (
              upcoming.slice(0, 6).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{s.objective ?? "Entrenamiento"}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.session_date} · {s.start_time?.slice(0, 5)} · {s.location ?? "Sin sede"}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {teams.find((t) => t.id === s.team_id)?.name ?? "Escuela"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-primary" /> Tareas y alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {pending.length > 0 ? (
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="font-medium">{pending.length} sesiones sin asistencia registrada</p>
                <Button asChild variant="link" className="h-auto p-0 text-xs">
                  <Link to="/entrenamientos">Registrar ahora</Link>
                </Button>
              </div>
            ) : null}
            {low.length === 0 ? (
              <p className="text-muted-foreground">Sin jugadores por debajo del 70%.</p>
            ) : (
              low.map(({ player, stat }) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2"
                >
                  <span>{player.full_name}</span>
                  <span className="font-medium">{stat.percentage}%</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Tus equipos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {myTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no tienes equipos asignados.</p>
          ) : (
            myTeams.map((t) => (
              <div key={t.id} className="rounded-lg border border-border/60 px-3 py-3">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {players.filter((p) => p.team_id === t.id).length} jugadores ·{" "}
                  {t.season ?? "Temporada actual"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
