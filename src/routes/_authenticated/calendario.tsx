import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useTenant } from "@/lib/tenant";
import { listCategories, listCoaches, listPlayers, listTeams } from "@/lib/api/school-data";
import {
  listEvents,
  listTrainingSessions,
  TRAINING_STATUS_LABEL,
  type SchoolEvent,
  type TrainingSession,
} from "@/lib/api/training";
import { resolveScope, sessionInScope } from "@/lib/api/scope";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario — FútbolGestión" },
      {
        name: "description",
        content: "Vista mensual, semanal y en lista de los entrenamientos y eventos de la escuela.",
      },
      { property: "og:title", content: "Calendario — FútbolGestión" },
      {
        property: "og:description",
        content: "Vista mensual, semanal y en lista de los entrenamientos y eventos de la escuela.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Elemento genérico del calendario; preparado para partidos, torneos y reuniones. */
interface CalendarItem {
  id: string;
  date: string;
  time: string | null;
  title: string;
  type: string;
  categoryId: string | null;
  teamId: string | null;
  session: TrainingSession | null;
  event: SchoolEvent | null;
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CalendarPage() {
  const { school, role, user } = useTenant();
  const schoolId = school?.id;

  const [view, setView] = useState<"mensual" | "semanal" | "lista">("mensual");
  const [cursor, setCursor] = useState(() => new Date());
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [teamFilter, setTeamFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [detail, setDetail] = useState<CalendarItem | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ["training-sessions", schoolId],
    enabled: !!schoolId,
    queryFn: () => listTrainingSessions(schoolId!),
  });
  const eventsQuery = useQuery({
    queryKey: ["events", schoolId],
    enabled: !!schoolId,
    queryFn: () => listEvents(schoolId!),
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories", schoolId],
    enabled: !!schoolId,
    queryFn: () => listCategories(schoolId!),
  });
  const teamsQuery = useQuery({
    queryKey: ["teams", schoolId],
    enabled: !!schoolId,
    queryFn: () => listTeams(schoolId!),
  });
  const coachesQuery = useQuery({
    queryKey: ["coaches", schoolId],
    enabled: !!schoolId,
    queryFn: () => listCoaches(schoolId!),
  });
  const playersQuery = useQuery({
    queryKey: ["players", schoolId],
    enabled: !!schoolId,
    queryFn: () => listPlayers(schoolId!),
  });

  const categories = categoriesQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  const scope = useMemo(
    () =>
      resolveScope({
        role,
        userId: user?.id,
        coaches: coachesQuery.data ?? [],
        teams,
        players: playersQuery.data ?? [],
      }),
    [role, user?.id, coachesQuery.data, teams, playersQuery.data],
  );

  const items = useMemo<CalendarItem[]>(() => {
    const sessions = (sessionsQuery.data ?? [])
      .filter((s) => sessionInScope(s, scope))
      .map<CalendarItem>((s) => ({
        id: `s-${s.id}`,
        date: s.session_date,
        time: s.start_time?.slice(0, 5) ?? null,
        title: s.objective ?? "Entrenamiento",
        type: "entrenamiento",
        categoryId: s.category_id,
        teamId: s.team_id,
        session: s,
        event: null,
      }));

    const events = (eventsQuery.data ?? [])
      .filter((e) => !e.session_id)
      .map<CalendarItem>((e) => ({
        id: `e-${e.id}`,
        date: e.event_date,
        time: e.start_time?.slice(0, 5) ?? null,
        title: e.title,
        type: e.type,
        categoryId: e.category_id,
        teamId: e.team_id,
        session: null,
        event: e,
      }));

    return [...sessions, ...events]
      .filter((i) => categoryFilter === "todas" || i.categoryId === categoryFilter)
      .filter((i) => teamFilter === "todos" || i.teamId === teamFilter)
      .filter((i) => typeFilter === "todos" || i.type === typeFilter)
      .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
  }, [sessionsQuery.data, eventsQuery.data, scope, categoryFilter, teamFilter, typeFilter]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [items]);

  if (sessionsQuery.error) return <ErrorState message={sessionsQuery.error.message} />;

  const days = view === "mensual" ? buildMonth(cursor) : buildWeek(cursor);
  const todayKey = toKey(new Date());

  return (
    <>
      <PageHeader
        title="Calendario"
        description="Entrenamientos y eventos de la escuela. Los partidos y torneos se integrarán aquí."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="mensual">Mensual</TabsTrigger>
            <TabsTrigger value="semanal">Semanal</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>
        </Tabs>

        {view !== "lista" ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor(shift(cursor, view === "mensual" ? "month" : "week", -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-44 text-center text-sm font-medium capitalize">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor(shift(cursor, view === "mensual" ? "month" : "week", 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
              Hoy
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Equipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los equipos</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="entrenamiento">Entrenamiento</SelectItem>
            <SelectItem value="partido">Partido</SelectItem>
            <SelectItem value="torneo">Torneo</SelectItem>
            <SelectItem value="reunion">Reunión</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sessionsQuery.isLoading ? (
        <LoadingRows rows={5} />
      ) : view === "lista" ? (
        items.length === 0 ? (
          <EmptyState title="Sin eventos" description="Aún no hay entrenamientos ni eventos programados." />
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDetail(item)}
                className="flex w-full items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-left text-sm transition-colors hover:bg-secondary/50"
              >
                <span>
                  <span className="font-medium">{item.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {item.date} {item.time ? `· ${item.time}` : ""}
                  </span>
                </span>
                <Badge variant="outline" className="capitalize">
                  {item.type}
                </Badge>
              </button>
            ))}
          </div>
        )
      ) : (
        <Card className="border-border/70 bg-card/80">
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase text-muted-foreground">
              {DAY_LABELS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((day) => {
                const key = toKey(day);
                const dayItems = byDate.get(key) ?? [];
                const otherMonth = view === "mensual" && day.getMonth() !== cursor.getMonth();
                return (
                  <div
                    key={key}
                    className={cn(
                      "min-h-24 rounded-lg border border-border/50 p-1.5 text-left",
                      otherMonth && "opacity-40",
                      key === todayKey && "border-primary/60 bg-primary/5",
                    )}
                  >
                    <span className="text-xs text-muted-foreground">{day.getDate()}</span>
                    <div className="mt-1 space-y-1">
                      {dayItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDetail(item)}
                          className="block w-full truncate rounded bg-primary/15 px-1.5 py-1 text-left text-[11px] text-primary hover:bg-primary/25"
                        >
                          {item.time ? `${item.time} ` : ""}
                          {item.title}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!detail} onOpenChange={(v) => (!v ? setDetail(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-1.5 text-sm">
              <p className="text-muted-foreground">
                {detail.date} {detail.time ? `· ${detail.time}` : ""}
              </p>
              {detail.session ? (
                <>
                  <p>Lugar: {detail.session.location ?? "—"}</p>
                  <p>Equipo: {teams.find((t) => t.id === detail.session?.team_id)?.name ?? "—"}</p>
                  <p>
                    Categoría:{" "}
                    {categories.find((c) => c.id === detail.session?.category_id)?.name ?? "—"}
                  </p>
                  <p>Estado: {TRAINING_STATUS_LABEL[detail.session.status]}</p>
                  {detail.session.description ? <p>{detail.session.description}</p> : null}
                </>
              ) : (
                <>
                  <p>Tipo: {detail.type}</p>
                  {detail.event?.location ? <p>Lugar: {detail.event.location}</p> : null}
                  {detail.event?.notes ? <p>{detail.event.notes}</p> : null}
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function shift(date: Date, unit: "month" | "week", amount: number) {
  const next = new Date(date);
  if (unit === "month") next.setMonth(next.getMonth() + amount);
  else next.setDate(next.getDate() + amount * 7);
  return next;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const weekday = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - weekday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeek(cursor: Date) {
  const start = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function buildMonth(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
