import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardCheck, Shield, Trophy } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCategories, listCoaches, listPlayers, listTeams } from "@/lib/api/school-data";
import { listAttendance, listEvents, listTrainingSessions } from "@/lib/api/training";
import { computeAttendance, LOW_ATTENDANCE_THRESHOLD } from "@/lib/rules/attendance";
import { useTenant } from "@/lib/tenant";
import { listEvaluations } from "@/lib/api/evaluations";
import { EvaluationHistory } from "@/components/evaluations/evaluation-history";

export const Route = createFileRoute("/_authenticated/jugador")({
  head: () => ({
    meta: [
      { title: "Mi portal deportivo — FútbolGestión" },
      {
        name: "description",
        content:
          "Consulta tu equipo, tu categoría, tu asistencia y tus próximos entrenamientos y partidos.",
      },
      { property: "og:title", content: "Mi portal deportivo — FútbolGestión" },
      {
        property: "og:description",
        content: "Tu información deportiva personal en FútbolGestión.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlayerPortal,
});

const today = () => new Date().toISOString().slice(0, 10);

function PlayerPortal() {
  const { school, user } = useTenant();
  const schoolId = school?.id ?? "";

  const q = useQuery({
    queryKey: ["player-portal", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const [players, teams, categories, coaches, sessions, attendance, events, evaluations] =
        await Promise.all([
          listPlayers(schoolId),
          listTeams(schoolId),
          listCategories(schoolId),
          listCoaches(schoolId),
          listTrainingSessions(schoolId),
          listAttendance(schoolId),
          listEvents(schoolId),
          listEvaluations(schoolId),
        ]);
      return { players, teams, categories, coaches, sessions, attendance, events, evaluations };
    },
  });

  if (q.isLoading) return <LoadingRows rows={5} />;
  if (q.error) return <ErrorState message={(q.error as Error).message} />;

  if (!q.data) return null;

  const { players, teams, categories, coaches, sessions, attendance, events, evaluations } = q.data;
  const me = players.find((p) => p.user_id === user?.id) ?? players[0];

  if (!me) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mi portal deportivo" />
        <EmptyState
          title="Tu cuenta aún no está vinculada a una ficha de jugador"
          description="Pide al administrador de la escuela que asocie tu correo con tu ficha deportiva."
        />
      </div>
    );
  }

  const team = teams.find((t) => t.id === me.team_id);
  const category = categories.find((c) => c.id === me.category_id);
  const coach = coaches.find((c) => c.id === team?.coach_id);
  const mySessions = sessions.filter(
    (s) => (me.team_id && s.team_id === me.team_id) || (me.category_id && s.category_id === me.category_id),
  );
  const stat = computeAttendance(
    attendance.filter((a) => a.player_id === me.id),
    mySessions,
  ).get(me.id);
  const upcoming = mySessions
    .filter((s) => s.status === "programado" && s.session_date >= today())
    .sort((a, b) => a.session_date.localeCompare(b.session_date));
  const agenda = events.filter((e) => e.event_date >= today()).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${me.full_name.split(" ")[0]}`}
        description="Tu equipo, tu asistencia y tus próximas actividades."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Equipo" value={team?.name ?? "Sin equipo"} hint={coach?.full_name} icon={Trophy} />
        <StatCard label="Categoría" value={category?.name ?? "—"} hint={me.position ?? undefined} icon={Shield} />
        <StatCard
          label="Mi asistencia"
          value={stat ? `${stat.percentage}%` : "—"}
          hint={stat ? `${stat.present}/${stat.registered} sesiones` : "Sin registros"}
          icon={ClipboardCheck}
        />
        <StatCard
          label="Próximos entrenamientos"
          value={upcoming.length}
          hint={upcoming[0]?.session_date}
          icon={CalendarDays}
        />
      </div>

      {stat && stat.registered >= 3 && stat.percentage < LOW_ATTENDANCE_THRESHOLD ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          Tu asistencia está por debajo del {LOW_ATTENDANCE_THRESHOLD}%. ¡Nos vemos en el próximo
          entrenamiento!
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Mis próximos entrenamientos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground">Sin entrenamientos programados.</p>
            ) : (
              upcoming.slice(0, 6).map((s) => (
                <div key={s.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <p className="font-medium">{s.objective ?? "Entrenamiento"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.session_date} · {s.start_time?.slice(0, 5)} · {s.location ?? "Sin sede"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Agenda de la escuela</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {agenda.length === 0 ? (
              <p className="text-muted-foreground">Sin eventos próximos.</p>
            ) : (
              agenda.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.event_date} · {e.location ?? "Sin sede"}
                    </p>
                  </div>
                  <Badge variant="outline">{e.type}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Mis evaluaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <EvaluationHistory items={evaluations.filter((e) => e.player_id === me.id)} />
        </CardContent>
      </Card>
    </div>
  );
}
