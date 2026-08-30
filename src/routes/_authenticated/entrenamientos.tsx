import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ClipboardCheck, MapPin, Plus, Search } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { useTenant } from "@/lib/tenant";
import { listCategories, listCoaches, listPlayers, listTeams } from "@/lib/api/school-data";
import {
  listSessionAttendance,
  listTrainingSessions,
  removeTrainingSession,
  saveAttendance,
  upsertTrainingSession,
  ATTENDANCE_STATUS_LABEL,
  TRAINING_STATUS_LABEL,
  type AttendanceStatus,
  type TrainingSession,
  type TrainingStatus,
} from "@/lib/api/training";
import { canManageTrainings, resolveScope, sessionInScope } from "@/lib/api/scope";
import type { Category, Coach, Player, Team } from "@/lib/api/client";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute("/_authenticated/entrenamientos")({
  head: () => ({
    meta: [
      { title: "Entrenamientos — FútbolGestión" },
      {
        name: "description",
        content: "Programa sesiones de entrenamiento y registra la asistencia de tus jugadores.",
      },
      { property: "og:title", content: "Entrenamientos — FútbolGestión" },
      {
        property: "og:description",
        content: "Programa sesiones de entrenamiento y registra la asistencia de tus jugadores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrainingsPage,
});

const sessionSchema = z.object({
  session_date: z.string().nonempty("La fecha es obligatoria"),
  start_time: z.string().nonempty("La hora de inicio es obligatoria"),
  end_time: z.string().optional(),
  location: z.string().trim().nonempty("El lugar es obligatorio").max(120),
  objective: z.string().trim().nonempty("El objetivo es obligatorio").max(160),
  description: z.string().trim().max(600).optional(),
});

const STATUS_VARIANT: Record<TrainingStatus, string> = {
  programado: "border-primary/50 bg-primary/10 text-primary",
  realizado: "border-accent/50 bg-accent/10",
  cancelado: "border-destructive/50 bg-destructive/10",
};

function TrainingsPage() {
  const { school, role, user } = useTenant();
  const schoolId = school?.id;
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"proximos" | "realizados" | "cancelados">("proximos");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [teamFilter, setTeamFilter] = useState("todos");
  const [coachFilter, setCoachFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("");
  const [editing, setEditing] = useState<TrainingSession | null>(null);
  const [creating, setCreating] = useState(false);
  const [attendanceFor, setAttendanceFor] = useState<TrainingSession | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ["training-sessions", schoolId],
    enabled: !!schoolId,
    queryFn: () => listTrainingSessions(schoolId!),
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

  const categories: Category[] = categoriesQuery.data ?? [];
  const teams: Team[] = teamsQuery.data ?? [];
  const coaches: Coach[] = coachesQuery.data ?? [];
  const players: Player[] = playersQuery.data ?? [];

  const scope = useMemo(
    () => resolveScope({ role, userId: user?.id, coaches, teams, players }),
    [role, user?.id, coaches, teams, players],
  );
  const editable = canManageTrainings(role);

  const saveMutation = useMutation({
    mutationFn: (values: Partial<TrainingSession> & { id?: string }) =>
      upsertTrainingSession(schoolId!, values),
    onSuccess: () => {
      toast.success("Entrenamiento guardado");
      setCreating(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["training-sessions", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["school-snapshot", schoolId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeTrainingSession(id),
    onSuccess: () => {
      toast.success("Entrenamiento eliminado");
      queryClient.invalidateQueries({ queryKey: ["training-sessions", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["school-snapshot", schoolId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = useMemo(
    () => (sessionsQuery.data ?? []).filter((s) => sessionInScope(s, scope)),
    [sessionsQuery.data, scope],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return visible.filter((s) => {
      if (tab === "proximos" && s.status !== "programado") return false;
      if (tab === "realizados" && s.status !== "realizado") return false;
      if (tab === "cancelados" && s.status !== "cancelado") return false;
      if (categoryFilter !== "todas" && s.category_id !== categoryFilter) return false;
      if (teamFilter !== "todos" && s.team_id !== teamFilter) return false;
      if (coachFilter !== "todos" && s.coach_id !== coachFilter) return false;
      if (dateFilter && s.session_date !== dateFilter) return false;
      if (term) {
        const haystack = `${s.objective ?? ""} ${s.location ?? ""} ${s.description ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [visible, tab, categoryFilter, teamFilter, coachFilter, dateFilter, search]);

  if (sessionsQuery.error) return <ErrorState message={sessionsQuery.error.message} />;

  return (
    <>
      <PageHeader
        title="Entrenamientos"
        description="Programa sesiones, controla su estado y registra la asistencia."
        actions={
          editable ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Nuevo entrenamiento
            </Button>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="proximos">Próximos</TabsTrigger>
          <TabsTrigger value="realizados">Realizados</TabsTrigger>
          <TabsTrigger value="cancelados">Cancelados</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por objetivo o lugar…"
            className="pl-9"
          />
        </div>
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
        <Select value={coachFilter} onValueChange={setCoachFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Entrenador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los entrenadores</SelectItem>
            {coaches.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
      </div>

      {sessionsQuery.isLoading ? (
        <LoadingRows rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sin entrenamientos"
          description={
            editable
              ? "Programa el primer entrenamiento para esta vista."
              : "Aún no hay entrenamientos registrados para tu equipo."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <Card key={s.id} className="border-border/70 bg-card/80">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{s.objective ?? "Entrenamiento"}</p>
                    <Badge variant="outline" className={STATUS_VARIANT[s.status]}>
                      {TRAINING_STATUS_LABEL[s.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {s.session_date} · {s.start_time?.slice(0, 5)}
                      {s.end_time ? `–${s.end_time.slice(0, 5)}` : ""}
                    </span>
                    {s.location ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {s.location}
                      </span>
                    ) : null}
                    <span>{teams.find((t) => t.id === s.team_id)?.name ?? "Sin equipo"}</span>
                    <span>{categories.find((c) => c.id === s.category_id)?.name ?? "Sin categoría"}</span>
                    <span>{coaches.find((c) => c.id === s.coach_id)?.full_name ?? "Sin entrenador"}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAttendanceFor(s)}>
                    <ClipboardCheck className="size-4" />
                    {editable ? "Registrar asistencia" : "Ver asistencia"}
                  </Button>
                  {editable ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm("¿Eliminar este entrenamiento?")) {
                            deleteMutation.mutate(s.id);
                          }
                        }}
                      >
                        Eliminar
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SessionDialog
        open={creating || !!editing}
        session={editing}
        categories={categories}
        teams={teams}
        coaches={coaches}
        pending={saveMutation.isPending}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={(values) => saveMutation.mutate({ ...values, ...(editing ? { id: editing.id } : {}) })}
      />

      {attendanceFor ? (
        <AttendanceDialog
          session={attendanceFor}
          schoolId={schoolId!}
          players={players}
          editable={editable}
          onClose={() => setAttendanceFor(null)}
        />
      ) : null}
    </>
  );
}

/* -------------------------------- formulario ------------------------------- */

function SessionDialog({
  open,
  session,
  categories,
  teams,
  coaches,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  session: TrainingSession | null;
  categories: Category[];
  teams: Team[];
  coaches: Coach[];
  pending: boolean;
  onClose: () => void;
  onSave: (values: Partial<TrainingSession>) => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [coachId, setCoachId] = useState("");
  const [status, setStatus] = useState<TrainingStatus>("programado");

  useEffect(() => {
    if (!open) return;
    setCategoryId(session?.category_id ?? "");
    setTeamId(session?.team_id ?? "");
    setCoachId(session?.coach_id ?? "");
    setStatus(session?.status ?? "programado");
  }, [open, session]);

  // Los equipos disponibles siempre pertenecen a la escuela activa.
  const teamOptions = categoryId ? teams.filter((t) => t.category_id === categoryId) : teams;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = sessionSchema.safeParse({
      session_date: form.get("session_date"),
      start_time: form.get("start_time"),
      end_time: form.get("end_time") || undefined,
      location: form.get("location"),
      objective: form.get("objective"),
      description: form.get("description") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisa los datos");
      return;
    }
    if (!categoryId && !teamId) {
      toast.error("Selecciona al menos categoría o equipo");
      return;
    }
    if (parsed.data.end_time && parsed.data.end_time <= parsed.data.start_time) {
      toast.error("La hora de finalización debe ser posterior al inicio");
      return;
    }
    onSave({
      ...parsed.data,
      end_time: parsed.data.end_time ?? null,
      description: parsed.data.description ?? null,
      category_id: categoryId || null,
      team_id: teamId || null,
      coach_id: coachId || null,
      status,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{session ? "Editar entrenamiento" : "Nuevo entrenamiento"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} key={session?.id ?? "new"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v);
                  setTeamId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Equipo</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona equipo" />
                </SelectTrigger>
                <SelectContent>
                  {teamOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Entrenador responsable</Label>
              <Select value={coachId} onValueChange={setCoachId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona entrenador" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TrainingStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRAINING_STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="session_date">Fecha *</Label>
              <Input
                id="session_date"
                name="session_date"
                type="date"
                defaultValue={session?.session_date ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Hora inicio *</Label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                defaultValue={session?.start_time?.slice(0, 5) ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">Hora fin</Label>
              <Input
                id="end_time"
                name="end_time"
                type="time"
                defaultValue={session?.end_time?.slice(0, 5) ?? ""}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Lugar *</Label>
            <Input id="location" name="location" defaultValue={session?.location ?? ""} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="objective">Objetivo *</Label>
            <Input id="objective" name="objective" defaultValue={session?.objective ?? ""} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción u observaciones</Label>
            <Textarea id="description" name="description" defaultValue={session?.description ?? ""} rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------- asistencia ------------------------------- */

function AttendanceDialog({
  session,
  schoolId,
  players,
  editable,
  onClose,
}: {
  session: TrainingSession;
  schoolId: string;
  players: Player[];
  editable: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});

  const roster = useMemo(
    () =>
      players.filter((p) =>
        session.team_id
          ? p.team_id === session.team_id
          : session.category_id
            ? p.category_id === session.category_id
            : false,
      ),
    [players, session],
  );

  const attendanceQuery = useQuery({
    queryKey: ["attendance", session.id],
    queryFn: () => listSessionAttendance(session.id),
  });

  useEffect(() => {
    if (!attendanceQuery.data) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const p of roster) next[p.id] = "presente";
    for (const row of attendanceQuery.data) next[row.player_id] = row.status;
    setMarks(next);
  }, [attendanceQuery.data, roster]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveAttendance(
        schoolId,
        session.id,
        roster.map((p) => ({ player_id: p.id, status: marks[p.id] ?? "presente" })),
      ),
    onSuccess: () => {
      toast.success("Asistencia guardada");
      queryClient.invalidateQueries({ queryKey: ["attendance", session.id] });
      queryClient.invalidateQueries({ queryKey: ["attendance", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["school-snapshot", schoolId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar asistencia</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {session.objective} · {session.session_date} · {session.start_time?.slice(0, 5)}
        </p>

        {attendanceQuery.isLoading ? (
          <LoadingRows rows={4} />
        ) : roster.length === 0 ? (
          <EmptyState
            title="Sin jugadores"
            description="El equipo o la categoría de este entrenamiento no tiene jugadores asociados."
          />
        ) : (
          <>
            {editable ? (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  setMarks(Object.fromEntries(roster.map((p) => [p.id, "presente" as AttendanceStatus])))
                }
              >
                Marcar todos como presentes
              </Button>
            ) : null}

            <div className="space-y-2">
              {roster.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm font-medium">{p.full_name}</span>
                  <div className="flex gap-1.5">
                    {(Object.keys(ATTENDANCE_STATUS_LABEL) as AttendanceStatus[]).map((value) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        disabled={!editable}
                        variant={marks[p.id] === value ? "default" : "outline"}
                        onClick={() => setMarks((prev) => ({ ...prev, [p.id]: value }))}
                      >
                        {ATTENDANCE_STATUS_LABEL[value]}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
              {editable ? (
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Guardando…" : "Guardar asistencia"}
                </Button>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
