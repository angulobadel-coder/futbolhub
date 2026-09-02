import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardCheck, HeartHandshake, Users } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCategories, listPlayers, listTeams } from "@/lib/api/school-data";
import { listAttendance, listEvents, listTrainingSessions } from "@/lib/api/training";
import { computeAttendance, LOW_ATTENDANCE_THRESHOLD } from "@/lib/rules/attendance";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/_authenticated/acudiente")({
  head: () => ({
    meta: [
      { title: "Portal de acudientes — FútbolGestión" },
      {
        name: "description",
        content:
          "Consulta la asistencia, los entrenamientos y la agenda deportiva de tus hijos en la escuela.",
      },
      { property: "og:title", content: "Portal de acudientes — FútbolGestión" },
      {
        property: "og:description",
        content: "Seguimiento del proceso deportivo de tus hijos en FútbolGestión.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuardianPortal,
});

const today = () => new Date().toISOString().slice(0, 10);

function GuardianPortal() {
  const { school } = useTenant();
  const schoolId = school?.id ?? "";
  const [activeId, setActiveId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["guardian-portal", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const [players, teams, categories, sessions, attendance, events] = await Promise.all([
        listPlayers(schoolId),
        listTeams(schoolId),
        listCategories(schoolId),
        listTrainingSessions(schoolId),
        listAttendance(schoolId),
        listEvents(schoolId),
      ]);
      return { players, teams, categories, sessions, attendance, events };
    },
  });

  if (q.isLoading) return <LoadingRows rows={5} />;
  if (q.error) return <ErrorState message={(q.error as Error).message} />;

  const { players, teams, categories, sessions, attendance, events } = q.data!;

  if (players.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Portal de acudientes" />
        <EmptyState
          title="Aún no tienes jugadores asociados"
          description="Pide al administrador de la escuela que vincule tu cuenta con la ficha de tu hijo o hija."
        />
      </div>
    );
  }

  const child = players.find((p) => p.id === activeId) ?? players[0]!;
  const team = teams.find((t) => t.id === child.team_id);
  const category = categories.find((c) => c.id === child.category_id);
  const childSessions = sessions.filter(
    (s) =>
      (child.team_id && s.team_id === child.team_id) ||
      (child.category_id && s.category_id === child.category_id),
  );
  const stat = computeAttendance(
    attendance.filter((a) => a.player_id === child.id),
    childSessions,
  ).get(child.id);
  const upcoming = childSessions
    .filter((s) => s.status === "programado" && s.session_date >= today())
    .sort((a, b) => a.session_date.localeCompare(b.session_date));
  const agenda = events
    .filter(
      (e) =>
        e.event_date >= today() &&
        (!e.team_id || e.team_id === child.team_id || e.category_id === child.category_id),
    )
    .slice(0, 5);
  const history = childSessions
    .filter((s) => s.status === "realizado")
    .sort((a, b) => b.session_date.localeCompare(a.session_date))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portal de acudientes"
        description="Información deportiva de tus hijos: asistencia, entrenamientos y agenda."
      />

      {players.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={p.id === child.id ? "default" : "outline"}
              onClick={() => setActiveId(p.id)}
            >
              {p.full_name}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jugador" value={child.full_name.split(" ")[0] ?? "—"} hint={child.full_name} icon={HeartHandshake} />
        <StatCard label="Equipo" value={team?.name ?? "Sin equipo"} hint={category?.name} icon={Users} />
        <StatCard
          label="Asistencia"
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

      {stat && stat.percentage < LOW_ATTENDANCE_THRESHOLD && stat.registered >= 3 ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          La asistencia de {child.full_name} está por debajo del {LOW_ATTENDANCE_THRESHOLD}%. Te
          recomendamos hablar con el entrenador del equipo.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Próximas actividades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {upcoming.length === 0 && agenda.length === 0 ? (
              <p className="text-muted-foreground">Sin actividades programadas.</p>
            ) : null}
            {upcoming.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{s.objective ?? "Entrenamiento"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.session_date} · {s.start_time?.slice(0, 5)} · {s.location ?? "Sin sede"}
                  </p>
                </div>
                <Badge variant="outline">Entrenamiento</Badge>
              </div>
            ))}
            {agenda.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.event_date} · {e.start_time?.slice(0, 5) ?? "Todo el día"} ·{" "}
                    {e.location ?? "Sin sede"}
                  </p>
                </div>
                <Badge variant="outline">{e.type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Historial de asistencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {history.length === 0 ? (
              <p className="text-muted-foreground">Aún no hay entrenamientos realizados.</p>
            ) : (
              history.map((s) => {
                const record = attendance.find(
                  (a) => a.session_id === s.id && a.player_id === child.id,
                );
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
                  >
                    <span>
                      {s.session_date} · {s.objective ?? "Entrenamiento"}
                    </span>
                    <Badge
                      variant={
                        record?.status === "presente"
                          ? "default"
                          : record?.status === "justificado"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {record?.status ?? "sin registro"}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
