import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CalendarCheck, Timer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { listCategories, listCoaches, listPlayers, listTeams } from "@/lib/api/school-data";
import { listAttendance, listTrainingSessions } from "@/lib/api/training";
import { resolveScope, sessionInScope } from "@/lib/api/scope";
import { computeAttendance, LOW_ATTENDANCE_THRESHOLD, MIN_RECORDS_FOR_ALERT } from "@/lib/rules/attendance";
import { attendanceBy, sessionMinutes, weeklyAttendance } from "@/lib/rules/stats";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/_authenticated/estadisticas")({
  head: () => ({
    meta: [
      { title: "Estadísticas deportivas — FútbolGestión" },
      { name: "description", content: "Asistencia semanal, rendimiento por equipo y alertas de inasistencia." },
      { property: "og:title", content: "Estadísticas deportivas — FútbolGestión" },
      { property: "og:description", content: "Asistencia y actividad deportiva de la escuela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatsPage,
});

const selectCls = "h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground";
const weekCfg = {
  presentes: { label: "Presentes", color: "var(--color-primary)" },
} satisfies ChartConfig;
const teamCfg = { porcentaje: { label: "% asistencia", color: "var(--color-primary)" } } satisfies ChartConfig;

function StatsPage() {
  const { school, role, user } = useTenant();
  const schoolId = school?.id ?? "";
  const [categoryId, setCategoryId] = useState("");
  const [teamId, setTeamId] = useState("");

  const q = useQuery({
    queryKey: ["stats", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const [sessions, attendance, players, teams, categories, coaches] = await Promise.all([
        listTrainingSessions(schoolId),
        listAttendance(schoolId),
        listPlayers(schoolId),
        listTeams(schoolId),
        listCategories(schoolId),
        listCoaches(schoolId),
      ]);
      return { sessions, attendance, players, teams, categories, coaches };
    },
  });

  const view = useMemo(() => {
    if (!q.data) return null;
    const d = q.data;
    const scope = resolveScope({ role, userId: user?.id, coaches: d.coaches, teams: d.teams, players: d.players });
    const teams = d.teams.filter((t) => scope.seesAll || scope.teamIds.includes(t.id));
    const sessions = d.sessions.filter(
      (s) =>
        sessionInScope(s, scope) &&
        (!categoryId || s.category_id === categoryId) &&
        (!teamId || s.team_id === teamId),
    );
    const ids = new Set(sessions.map((s) => s.id));
    const attendance = d.attendance.filter((a) => ids.has(a.session_id));
    const done = sessions.filter((s) => s.status === "realizado");
    const minutes = done.reduce((acc, s) => acc + sessionMinutes(s), 0);
    const present = attendance.filter((a) => a.status === "presente").length;
    const weekly = weeklyAttendance(attendance, sessions).slice(-12);
    const thisWeek = weekly.at(-1)?.presentes ?? 0;
    const teamName = new Map(d.teams.map((t) => [t.id, t.name]));
    const byTeam = [...attendanceBy(attendance, sessions, (s) => s.team_id).entries()]
      .map(([id, v]) => ({ name: teamName.get(id) ?? "Equipo", ...v }))
      .sort((a, b) => b.porcentaje - a.porcentaje);
    const perPlayer = computeAttendance(attendance, sessions);
    const playerName = new Map(d.players.map((p) => [p.id, p.full_name]));
    const players = [...perPlayer.values()]
      .map((p) => ({ ...p, name: playerName.get(p.playerId) ?? "Jugador" }))
      .sort((a, b) => a.percentage - b.percentage);
    const alerts = players.filter(
      (p) => p.registered >= MIN_RECORDS_FOR_ALERT && p.percentage < LOW_ATTENDANCE_THRESHOLD,
    );
    return {
      teams,
      categories: d.categories.filter((c) => scope.seesAll || scope.categoryIds.includes(c.id)),
      done: done.length,
      minutes,
      pct: attendance.length ? Math.round((present / attendance.length) * 100) : 0,
      thisWeek,
      weekly: weekly.map((w) => ({ ...w, label: w.week.slice(5).split("-").reverse().join("/") })),
      byTeam,
      players,
      alerts,
    };
  }, [q.data, role, user?.id, categoryId, teamId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estadísticas"
        description="Asistencia y actividad deportiva de tus equipos."
        actions={
          view ? (
            <>
              <select className={selectCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Categoría">
                <option value="">Todas las categorías</option>
                {view.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className={selectCls} value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Equipo">
                <option value="">Todos los equipos</option>
                {view.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </>
          ) : null
        }
      />
      {q.isLoading ? <LoadingRows /> : q.error ? <ErrorState message={(q.error as Error).message} /> : !view ? null : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Presentes esta semana" value={view.thisWeek} icon={CalendarCheck} hint="Última semana con registros" />
            <StatCard label="Asistencia media" value={`${view.pct}%`} icon={Activity} />
            <StatCard label="Entrenos realizados" value={view.done} icon={Timer} hint={`${Math.round(view.minutes / 60)} h entrenadas`} />
            <StatCard label="Alertas" value={view.alerts.length} icon={AlertTriangle} hint={`Bajo ${LOW_ATTENDANCE_THRESHOLD}% de asistencia`} />
          </div>

          {view.weekly.length === 0 ? (
            <EmptyState title="Aún no hay asistencia registrada" description="Registra la asistencia en un entrenamiento para ver las estadísticas." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Presentes por semana</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={weekCfg} className="h-64 w-full">
                    <LineChart data={view.weekly}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line dataKey="presentes" stroke="var(--color-presentes)" strokeWidth={2} dot />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Asistencia por equipo</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={teamCfg} className="h-64 w-full">
                    <BarChart data={view.byTeam}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="porcentaje" fill="var(--color-porcentaje)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {view.players.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Asistencia por jugador</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="py-2">Jugador</th><th>Registros</th><th>Presente</th><th>Justif.</th><th>Ausente</th><th>%</th></tr>
                  </thead>
                  <tbody>
                    {view.players.map((p) => {
                      const low = p.registered >= MIN_RECORDS_FOR_ALERT && p.percentage < LOW_ATTENDANCE_THRESHOLD;
                      return (
                        <tr key={p.playerId} className="border-t border-border">
                          <td className="py-2 font-medium">{p.name}</td>
                          <td>{p.registered}</td><td>{p.present}</td><td>{p.justified}</td><td>{p.absent}</td>
                          <td><Badge variant={low ? "destructive" : "secondary"}>{p.percentage}%</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
